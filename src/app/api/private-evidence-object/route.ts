import {privateEvidenceRequest} from '@/lib/storage-worker';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function PUT(request:Request){return privateEvidenceRequest(request)}
export async function GET(request:Request){return privateEvidenceRequest(request)}
