/** Generate idempotent D1 seed from the exact original VeroTask catalog.
 * Do not eval TypeScript or modify claimed/user-edited business records.
 */
import ts from 'typescript';
import fs from 'node:fs';
const src=fs.readFileSync('src/db/seed.ts','utf8');
const tree=ts.createSourceFile('src/db/seed.ts',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
function value(node){
  if(ts.isAsExpression(node)||ts.isParenthesizedExpression(node))return value(node.expression);
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
  if(ts.isNumericLiteral(node))return Number(node.text);
  if(node.kind===ts.SyntaxKind.TrueKeyword)return true;
  if(node.kind===ts.SyntaxKind.FalseKeyword)return false;
  if(ts.isArrayLiteralExpression(node))return node.elements.map(value);
  if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(item=>{
    if(!ts.isPropertyAssignment(item)||(!ts.isIdentifier(item.name)&&!ts.isStringLiteral(item.name)))throw Error('Unsupported object syntax');
    return [item.name.text,value(item.initializer)];
  }));
  throw Error('Unsupported catalog syntax: '+ts.SyntaxKind[node.kind]);
}
const catalog={};
function visit(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&['categorySeed','businessSeed'].includes(n.name.text))catalog[n.name.text]=value(n.initializer);ts.forEachChild(n,visit)}
visit(tree);
if(!Array.isArray(catalog.categorySeed)||!Array.isArray(catalog.businessSeed)||catalog.categorySeed.length<10||catalog.businessSeed.length<10)throw Error('Missing original catalog');
const lit=x=>x==null?'NULL':typeof x==='boolean'?(x?'1':'0'):typeof x==='number'?String(x):"'"+String(x).replaceAll("'","''")+"'";
const sql=[`-- Generated ONLY from src/db/seed.ts; categories=${catalog.categorySeed.length}; unclaimed businesses=${catalog.businessSeed.length}.`,`-- This is public seed content, NOT an export of historic Neon database.`,'-- Idempotent INSERT OR IGNORE preserves any pre-existing claimed or edited records.','PRAGMA foreign_keys=ON;'];
for(const [slug,en,pt,es,before,after] of catalog.categorySeed){sql.push(`INSERT OR IGNORE INTO categories (slug,name_en,name_pt_br,name_es,requires_before_photos,requires_after_photos,requires_checklist) VALUES (${[slug,en,pt,es,before,after,true].map(lit).join(',')});`)}
const fields={name:'name',slug:'slug',description:'description',publicPhone:'public_phone',publicEmail:'public_email',websiteUrl:'website_url',sourceUrl:'source_url',addressLine1:'address_line_1',city:'city',state:'state',postalCode:'postal_code'};
for(const item of catalog.businessSeed){
  const columns=Object.keys(fields).filter(k=>item[k]!==undefined);
  if(item.state!=='FL'||!item.slug||!item.name||!Array.isArray(item.categories))throw Error('Invalid original seed company');
  const names=columns.map(x=>fields[x]).concat(['status','plan','imported_from_public_source']);
  const values=columns.map(x=>item[x]).concat(['unclaimed','free',true]);
  sql.push(`INSERT OR IGNORE INTO businesses (${names.join(',')}) VALUES (${values.map(lit).join(',')});`);
  for(const category of item.categories){
    if(!catalog.categorySeed.some(([slug])=>slug===category))throw Error('Invalid category reference '+category);
    sql.push(`INSERT OR IGNORE INTO business_categories (business_id,category_id) SELECT b.id,c.id FROM businesses b JOIN categories c ON c.slug=${lit(category)} WHERE b.slug=${lit(item.slug)};`);
  }
}
const out='cloudflare/d1/seeds/0001_public_unclaimed_from_original_source.sql';
fs.writeFileSync(out,sql.join('\n')+'\n');
console.log(JSON.stringify({categories:catalog.categorySeed.length,businesses:catalog.businessSeed.length,links:catalog.businessSeed.reduce((acc,b)=>acc+b.categories.length,0),output:out},null,2));
