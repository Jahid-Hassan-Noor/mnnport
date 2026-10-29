import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("all ten portals remain navigable with simulation disclosure",async({page})=>{
  test.setTimeout(90000);
  const external:string[]=[];page.on("request",r=>{if(!r.url().startsWith("http://nginx/"))external.push(r.url())});
  const pageErrors:string[]=[];page.on("pageerror",error=>pageErrors.push(error.message));
  for(const route of ["control","berths","yard","safety","gate","audit","energy","cyber","shipping-line","group"]){await page.goto(`/${route}`);await expect(page.getByText("Simulated data",{exact:true}).first()).toBeVisible();await expect(page.locator(".portal-main h1")).toBeVisible();}
  expect(external).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("scene breach and recovery require human approval and update one state",async({page})=>{
  test.setTimeout(60000);
  const consoleErrors:string[]=[];page.on("pageerror",error=>consoleErrors.push(error.message));
  await page.goto("/control");await expect(page.locator('.app-shell[data-interactive="true"]')).toBeVisible({timeout:15000});await page.keyboard.press("Shift+4");await expect(page.locator(".status-strip").getByText("SCENE 4 / 6")).toBeVisible();
  await page.getByRole("button",{name:"Ask Port Command Grounded in simulated state"}).click();
  await page.getByRole("button",{name:"Who is in a crane exclusion zone?"}).click();
  await expect(page.getByText("Crane 3 is held",{exact:false})).toBeVisible();
  await page.getByRole("button",{name:"Approve",exact:true}).click();
  await page.getByRole("button",{name:"Confirm approval"}).click();
  await expect(page.getByText("approved by presenter",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Approve",exact:true})).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator(".top-nav").getByRole("link",{name:"Audit"}).click();
  await expect(page.getByText("ZONE BREACH",{exact:true})).toBeVisible({timeout:15000});
  await expect(page.getByText("PROPOSAL APPROVED",{exact:true})).toBeVisible();
  await page.keyboard.press("Shift+5");await expect(page.locator(".status-strip").getByText("SCENE 5 / 6")).toBeVisible();
  await page.getByRole("button",{name:"Ask Port Command Grounded in simulated state"}).click();
  await page.getByRole("button",{name:"Why is Berth 2 behind schedule?"}).click();
  await expect(page.getByText("24 minutes",{exact:false})).toBeVisible();
  await page.getByRole("button",{name:"Approve",exact:true}).click();await page.getByRole("button",{name:"Confirm approval"}).click();
  await expect(page.getByText("approved by presenter",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Approve",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Which vessel will be late?"}).click();await expect(page.getByText("13 simulated minutes",{exact:false})).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".top-nav").getByRole("link",{name:"Yard"}).click();
  await expect(page.getByRole("button",{name:"PM-01",exact:true})).toBeVisible({timeout:15000});
  await page.getByRole("button",{name:"PM-01",exact:true}).click();
  await expect(page.getByRole("complementary",{name:"vehicle inspector"})).toContainText("Berth 2");
  await page.keyboard.press("Escape");
  await page.locator(".top-nav").getByRole("link",{name:"Audit"}).click();
  await expect(page.getByText("PROPOSAL APPROVED",{exact:true})).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("map search opens inspectors and worker privacy changes with demo role",async({page})=>{
  await page.goto("/control");await expect(page.locator('.app-shell[data-interactive="true"]')).toBeVisible();await page.getByRole("textbox",{name:"Search map entities"}).fill("Orient Gale");
  await page.locator(".search-results").getByRole("button",{name:"MV Orient Gale",exact:true}).click();await expect(page.getByRole("complementary",{name:"vessel inspector"})).toBeVisible();
  await page.keyboard.press("Escape");await page.goto("/safety");await expect(page.locator('.app-shell[data-interactive="true"]')).toBeVisible();await page.getByRole("button",{name:/W-001/}).click();
  await expect(page.getByText("Zone level only · demo privacy")).toBeVisible();
  await page.getByRole("combobox",{name:"Demo role"}).selectOption("supervisor");await page.getByRole("button",{name:/W-001/}).click();
  await expect(page.getByText(/fictional$/).last()).toBeVisible();
});

test("audit exports a clearly marked mock PDF",async({page})=>{
  await page.goto("/audit");await expect(page.locator('.app-shell[data-interactive="true"]')).toBeVisible();const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Export mock PDF"}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^port-command-mock-audit-\d{4}-\d{2}-\d{2}\.pdf$/);expect((await readFile(await download.path())).subarray(0,5).toString()).toBe("%PDF-");
});

test("control room fits both presentation viewports",async({page})=>{
  for(const [width,height] of [[1366,768],[1920,1080]]){
    await page.setViewportSize({width,height});await page.goto("/control");
    await expect(page.locator(".map-panel")).toBeVisible();await expect(page.locator(".status-strip")).toBeVisible();
    const size=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,mapHeight:document.querySelector(".map-panel")!.getBoundingClientRect().height}));
    expect(size.pageWidth).toBeLessThanOrEqual(size.innerWidth);expect(size.mapHeight).toBeGreaterThan(250);
  }
});

test("locally rendered 3D model appears on landing and can be toggled over the map",async({page})=>{
  await page.goto("/");await expect(page.locator(".port-diorama.hero canvas")).toBeVisible({timeout:15000});
  await page.goto("/control");await expect(page.locator('.app-shell[data-interactive="true"]')).toBeVisible();
  await expect(page.locator(".port-diorama.inset canvas")).toBeVisible({timeout:15000});
  await page.getByRole("button",{name:/Hide 3D twin/}).click();await expect(page.locator(".port-diorama.inset")).toHaveCount(0);
  await page.getByRole("button",{name:/Show 3D twin/}).click();await expect(page.locator(".port-diorama.inset canvas")).toBeVisible({timeout:15000});
});

test("close inspections and stage action keep the map clear while the twin remains optional",async({page})=>{
  await page.goto("/control");
  await expect(page.locator(".port-diorama.inset canvas")).toBeVisible({timeout:15000});
  await page.keyboard.press("Shift+3");
  await expect(page.locator(".port-diorama.inset")).toHaveCount(0);
  await page.getByRole("button",{name:/Show 3D twin/}).click();
  await expect(page.locator(".port-diorama.inset canvas")).toBeVisible();
  await page.keyboard.press("Shift+4");
  await expect(page.locator(".port-diorama.inset")).toHaveCount(0);
  await page.keyboard.press("Shift+1");
  await page.getByRole("textbox",{name:"Search map entities"}).fill("PM-01");
  await page.getByRole("button",{name:"PM-01",exact:true}).click();
  await expect(page.locator(".port-diorama.inset")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Following vehicle · click to stop"})).toBeVisible();
});

test("one theme switch persists light and dark mode across routes and reloads",async({page})=>{
  test.setTimeout(60000);
  await page.goto("/");
  const switcher=page.getByRole("button",{name:"Toggle dark and light mode"});
  await expect(switcher).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await switcher.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await page.goto("/control");
  await expect(page.getByRole("button",{name:"Toggle dark and light mode"})).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await expect(page.locator(".map-panel")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  for(const route of ["/login","/forgot-password"]){
    await page.goto(route);
    await expect(page.getByRole("button",{name:"Toggle dark and light mode"})).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  }
  await page.getByRole("button",{name:"Toggle dark and light mode"}).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  expect(await page.evaluate(()=>localStorage.getItem("port-command-theme"))).toBe("dark");
});

test("stage controls jump, reset and start the continuous demo",async({page})=>{
  test.setTimeout(60000);
  await page.goto("/control");
  await expect(page.locator('.app-shell[data-interactive="true"]')).toBeVisible();
  for(let scene=1;scene<=6;scene++){
    await page.keyboard.press(`Shift+${scene}`);
    await expect(page.locator(".status-strip").getByText(`SCENE ${scene} / 6`)).toBeVisible();
  }
  await page.keyboard.press("d");
  await page.getByRole("button",{name:"Reset full simulation"}).click();
  await expect(page.locator(".status-strip").getByText("SCENE 1 / 6")).toBeVisible();
  await page.getByRole("button",{name:"Run Stage Demo · 5 minutes"}).click();
  await expect(page.locator(".status-strip").getByText("SCENE 1 / 6")).toBeVisible();
  await page.getByRole("button",{name:"5×"}).click();
  await expect(page.locator(".status-strip").getByText("SCENE 2 / 6")).toBeVisible({timeout:17000});
});

test("search reaches all six inspector types through keyboard accessible results",async({page})=>{
  test.setTimeout(60000);
  await page.goto("/control");
  await expect(page.locator('.app-shell[data-interactive="true"]')).toBeVisible();
  const cases:[string,string,string][]=[
    ["Orient Gale","MV Orient Gale","vessel"],
    ["PM-01","PM-01","vehicle"],
    ["W-005","W-005","worker"],
    ["SLTU1000000","SLTU1000000","container"],
    ["QC-03","QC-03","crane"],
    ["B2","B2","berth"],
  ];
  for(const [query,result,type] of cases){
    await page.getByRole("textbox",{name:"Search map entities"}).fill(query);
    await page.locator(".search-results").getByRole("button",{name:result,exact:true}).click();
    await expect(page.getByRole("complementary",{name:`${type} inspector`})).toBeVisible();
    await page.keyboard.press("Escape");
  }
});

test("all twelve scripted copilot intentions answer from the simulated state",async({page})=>{
  await page.goto("/control");
  await expect(page.locator('.app-shell[data-interactive="true"]')).toBeVisible();
  await page.keyboard.press("Shift+5");
  await page.getByRole("button",{name:"Ask Port Command Grounded in simulated state"}).click();
  const prompts=[
    "What is happening at Berth 2?","Why is Berth 2 behind schedule?","Which vessel will be late?",
    "Who is in a crane exclusion zone?","Show last night's safety incidents","What should we change to recover the delay?",
    "What if Orient Gale arrives 20 minutes late?","Summarise this shift","Is Crane 3's certificate valid?",
    "How much energy have electric prime movers used today?","Prepare this week's audit report","Compare all five ports",
  ];
  for(let i=0;i<prompts.length;i++){
    await page.locator(".suggestions").getByRole("button",{name:prompts[i],exact:true}).click();
    await expect(page.locator(".message-answer")).toHaveCount(i+1);
  }
  await expect(page.locator(".message-answer").last()).toContainText("Simulated data");
});

test("fictional map pans, zooms and exposes a local frame-rate readout",async({page})=>{
  await page.goto("/control");
  const panel=page.locator(".map-panel");
  await expect(panel).toHaveAttribute("data-zoom",/\d/);
  const box=await panel.boundingBox();expect(box).not.toBeNull();
  const x=box!.x+box!.width*.65,y=box!.y+box!.height*.62;
  const originalZoom=await panel.getAttribute("data-zoom");
  await page.mouse.move(x,y);await page.mouse.wheel(0,-530);
  await expect.poll(()=>panel.getAttribute("data-zoom")).not.toBe(originalZoom);
  const originalCenter=await panel.getAttribute("data-center");
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+70,y+30,{steps:8});await page.mouse.up();
  await expect.poll(()=>panel.getAttribute("data-center")).not.toBe(originalCenter);
  await expect(panel.getByLabel("Map canvas frame rate")).toContainText(/MAP \d+ FPS/);
});

test("compact map opens close enough to read vehicles and stacked containers",async({page})=>{
  await page.setViewportSize({width:662,height:827});
  await page.goto("/control");
  const panel=page.locator(".map-panel");
  await expect(panel).toHaveAttribute("data-objects3d","ready",{timeout:25000});
  await expect.poll(async()=>Number(await panel.getAttribute("data-zoom"))).toBeGreaterThan(18.1);
  await page.getByRole("button",{name:"View container yard"}).click();
  await expect.poll(async()=>Number(await panel.getAttribute("data-zoom"))).toBeGreaterThan(18.4);
});

test("3D vehicles and container stacks appear in their yards with direct map focus",async({page})=>{
  await page.goto("/control");
  const panel=page.locator(".map-panel");
  await expect(panel).toHaveAttribute("data-objects3d","ready",{timeout:25000});
  await page.getByRole("button",{name:"View container yard"}).click();
  await expect.poll(async()=>Number(await panel.getAttribute("data-zoom"))).toBeGreaterThan(16.3);
  await page.getByRole("button",{name:"Overview",exact:true}).click();
  await expect.poll(async()=>Number(await panel.getAttribute("data-zoom"))).toBeLessThan(15.4);
  for(const [query,type] of [["PM-01","vehicle"],["SLTU1000000","container"]]){
    await page.getByRole("textbox",{name:"Search map entities"}).fill(query);
    await page.getByRole("button",{name:query,exact:true}).first().click();
    await expect(page.getByRole("complementary",{name:`${type} inspector`})).toBeVisible();
    await expect.poll(async()=>Number(await panel.getAttribute("data-zoom"))).toBeGreaterThan(17.7);
    await page.keyboard.press("Escape");
  }
});

test("truck clicks show linked cargo or an empty load and supervisor GPS workers move",async({page})=>{
  test.setTimeout(60000);
  await page.goto("/control");
  await expect(page.locator('.map-panel[data-objects3d="ready"]')).toBeVisible({timeout:25000});
  const search=page.getByRole("textbox",{name:"Search map entities"});
  await search.fill("PM-01");
  await page.getByRole("button",{name:"PM-01",exact:true}).click();
  const loaded=page.getByRole("complementary",{name:"vehicle inspector"});
  await expect(loaded).toContainText("Carrying container");
  await expect(loaded).toContainText(/SLTU\d{7}/);
  await expect.poll(async()=>Number(await page.locator(".map-panel").getAttribute("data-zoom"))).toBeGreaterThan(18.8);
  await page.keyboard.press("Escape");
  const mapBox=await page.locator(".map-root").boundingBox();
  expect(mapBox).not.toBeNull();
  await page.mouse.click(mapBox!.x+mapBox!.width/2,mapBox!.y+mapBox!.height/2);
  await expect(page.getByRole("complementary",{name:"vehicle inspector"})).toContainText("PM-01");
  await page.keyboard.press("Escape");
  await search.fill("PM-02");
  await page.getByRole("button",{name:"PM-02",exact:true}).click();
  const empty=page.getByRole("complementary",{name:"vehicle inspector"});
  await expect(empty).toContainText("Empty");
  await expect(empty).not.toContainText("CARRYING CONTAINER");
  await page.keyboard.press("Escape");
  await page.getByRole("combobox",{name:"Demo role"}).selectOption("supervisor");
  await search.fill("W-001");
  await page.getByRole("button",{name:"W-001",exact:true}).click();
  const worker=page.getByRole("complementary",{name:"worker inspector"});
  await expect(worker).toContainText("GPS-W-001");
  const position=worker.locator(".inspect-row").filter({hasText:"Position"});
  const initial=await position.innerText();
  await page.getByRole("button",{name:"5×"}).click();
  await expect.poll(()=>position.innerText()).not.toBe(initial);
});

test("group drill-down remains illustrative and terminal demo stays separate",async({page})=>{
  await page.goto("/group");
  await expect(page.locator(".port-tile")).toHaveCount(5);
  await page.getByRole("button",{name:/Johor Port/}).click();
  await expect(page.getByRole("heading",{name:"Johor Port · illustrative drill-down"})).toBeVisible();
  await expect(page.getByText(/does not represent a connected system/)).toBeVisible();
  await page.getByRole("button",{name:/Explore fictional Selat Terminal demo/}).click();
  await expect(page).toHaveURL(/\/control$/);
});
