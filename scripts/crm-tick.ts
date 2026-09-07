import { runCrmAutomations } from "../src/lib/crm-automation";

runCrmAutomations(100).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
  console.error(error instanceof Error ? error.message : "CRM run failed");
  process.exitCode = 1;
});
