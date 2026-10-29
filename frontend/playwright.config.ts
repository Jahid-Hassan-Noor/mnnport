import { defineConfig } from "@playwright/test";
export default defineConfig({testDir:"./tests/e2e",use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||"http://nginx",browserName:"chromium",viewport:{width:1366,height:768},launchOptions:{args:["--use-gl=angle","--use-angle=swiftshader"]}},reporter:"list",timeout:30000});
