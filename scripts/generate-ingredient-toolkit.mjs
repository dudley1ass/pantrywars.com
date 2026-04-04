import fs from "fs";

const html = fs.readFileSync("public/index.html", "utf8");
const start = html.indexOf("const FULL_PANTRY = [");
const end = html.indexOf("\n];", start);
const block = html.slice(start, end);
const chunks = block.split(/\},\s*\n/).map((s) => s.trim().replace(/^\{/, "{"));
const items = [];
for (const ch of chunks) {
  if (!ch.includes("name:")) continue;
  const idm = ch.match(/id:(\d+)/);
  const nm = ch.match(/name:"([^"]*)"/);
  const cm = ch.match(/cat:"([^"]*)"/);
  if (idm && nm && cm) items.push({ id: +idm[1], name: nm[1], cat: cm[1] });
}
items.sort((a, b) => a.id - b.id);

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function lines(...rows) {
  return rows.join("\n");
}

/** Hand-tuned toolkits (same text previously inline on key items). */
const CURATED = {
  Eggs: {
    ai: "Toolkit: emulsify (mayo/hollandaise-style), soft-cook center, scramble base, bind structure (forcemeat/batter), cured yolk garnish — egg = fat + protein + emulsifier + binder, not one role.",
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Emulsify → Rich sauce → Mayo, dressings",
      "Soft-cook → Jammy / runny center → Plate anchor",
      "Scramble → Tender curd → Bowl, rice topper",
      "Bind → Structure → Cakes, meatballs, coatings",
      "Cure yolk (where appropriate) → Savory garnish → Shave / grate",
      "",
      "Primary roles: emulsifier · protein · structure"
    ),
  },
  "Tomatoes (Fresh)": {
    ai: "Toolkit: raw acid & juice, cooked-down sauce, roast sweetness, blended liquid, grated pulp — tomato = acid, base, depth, or instant wet sauce depending on form.",
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Raw / wedge → Fresh acid → Salad, finish",
      "Cook down → Concentrated sauce → Pasta, braise base",
      "Roast / char → Sweet depth → Side, relish",
      "Blend → Liquid / passata → Dressing, soup",
      "Grate → Pulp + juice → Fast pan sauce",
      "",
      "Roles: brightness · body · sweetness balance"
    ),
  },
  Cauliflower: {
    ai: "Toolkit: purée cream, rice substitute, roast caramel, raw shave crunch, fry crisp — veg as starch mimic, sauce body, or texture layer.",
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Blend / purée → Cream → Sauce, soup body",
      "Rice / crumb → Grain sub → Bowl, pilaf",
      "Roast / char → Caramel nutty → Side, steak",
      "Shave raw → Crunch → Salad, slaw",
      "Fry → Crisp bite → Snack, garnish",
      "",
      "Roles: neutral canvas · bulk · crunch"
    ),
  },
  "Sweet Potatoes": {
    ai: "Toolkit: crisp cubes, mash, thin chips/coins, purée thickener, roast depth — starch as base, texture, body, or sweetness vs savory.",
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Cube + roast / crisp → Bite / base → Bowl, hash",
      "Mash → Creamy carrier → Side, topping",
      "Slice thin → Chips / coins → Crunch layer",
      "Blend → Thickener → Sauce, soup",
      "Roast whole / wedge → Sweet depth → Balance acid/heat",
      "",
      "Roles: starch backbone · natural sweetness"
    ),
  },
  "Chicken Breast": {
    ai: "Toolkit: slice thin (fast protein), dice (even bowl), grind (filling), poach-shred (soft salad), pound cutlet (crust) — same SKU, different functional roles.",
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Slice thin → Fast-cook protein → Stir-fry, sear",
      "Dice small → Even cooking → Bowl, pasta",
      "Grind → Chicken mince → Meatballs, filling",
      "Poach + shred → Soft protein → Salad, sandwich",
      "Pound thin → Cutlet → Crispy dishes",
      "",
      "Primary: lean anchor — surface area beats dryness."
    ),
  },
  Mozzarella: {
    ai: "Toolkit: melt stretch, cube bite, pan-crisp shell, blended creamy base, stuffed filling — cheese as glue, texture, or carrier.",
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Melt → Stretch / bind → Pizza, gratin top",
      "Cube / tear → Soft chew → Salad, skewer",
      "Crisp (dry pan) → Brown crust → Garnish, bun",
      "Blend / whip (with liquid) → Creamy base → Dip, sauce body",
      "Stuff / tuck → Molten pocket → Proteins, veg",
      "",
      "Roles: fat + protein · melt texture · salt"
    ),
  },
  Brisket: {
    ai: "Toolkit: thin sear (fast crust), grind (burger/sauce body), shave (sandwich), dice braise (stew), render trim fat (flavor oil) — collagen beef becomes different eating experiences by form.",
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Slice thin → Fast steak bite → Hot sear, taco",
      "Grind → Ground protein → Burgers, sauces, filling",
      "Shave → Cheesesteak style → Sandwich, rice bowl",
      "Dice small → Quick braise → Stew, chili",
      "Render fat (trim) → Cooking fat → Sauté, roux start",
      "",
      "Primary: tough collagen — honesty on time still applies."
    ),
  },
};

function bakingByName(name) {
  const n = name.toLowerCase();
  if (n.includes("flour") || n === "cornmeal" || n.includes("cornstarch"))
    return entry({
      ai: `Toolkit (${name}): structure + thicken — flour/starch as body (dough, roux, slurry, dredge); hydration defines outcome.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Hydrate + knead → Gluten structure → Bread, pasta",
        "Roux / beurre manié → Thicken → Sauce, stew",
        "Slurry → Fast thicken → Stir-fry, soup",
        "Dredge / batter → Crust anchor → Fry, bake",
        "Toast dry (cornmeal) → Nutty base → Polenta, crust",
        "",
        "Roles: structure · thicken · coat"
      ),
    });
  if (n === "butter")
    return entry({
      ai: "Toolkit (Butter): cook medium, brown for nutty fat, laminate pastry, emulsify finish — fat + flavor carrier.",
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Cream + sugar → Aerate → Cookies, cake",
        "Brown → Nutty fat → Sauce, fish finish",
        "Laminate → Flaky layers → Pastry",
        "Mount sauce → Shine + richness → Veg, meat",
        "Clarify (ghee path) → High-heat fat → Sear",
        "",
        "Roles: fat · flavor · texture"
      ),
    });
  if (n.includes("heavy cream") || n === "crème fraîche" || n === "mascarpone" || n === "ricotta")
    return entry({
      ai: `Toolkit (${name}): reduce, whip, fold, enrich — dairy fat as body, cloud, or tang.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Reduce → Silky sauce → Pasta, steak",
        "Whip → Soft peak → Dessert, soup dollop",
        "Fold → Mousse body → Fillings",
        "Simmer gentle → Cream soups → Chowder",
        "Culture / tang → Balance → Dip, frosting",
        "",
        "Roles: richness · body · tang"
      ),
    });
  if (n.includes("honey") || n.includes("sugar") || n.includes("maple") || n.includes("marshmallow") || n.includes("chocolate"))
    return entry({
      ai: `Toolkit (${name}): sweeten, caramelize, balance acid/salt — sugar as glaze, crunch, or preserve.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Dissolve → Sweet base → Syrup, brine",
        "Caramelize → Bitter-sweet → Sauce, flan",
        "Cream → Ganache / fondant → Dessert",
        "Drizzle finish → Shine → Plate",
        "Whip with whites → Structure → Meringue",
        "",
        "Roles: sweet · color · texture"
      ),
    });
  if (n.includes("panko") || n.includes("phyllo") || n.includes("puff pastry") || n.includes("sourdough starter"))
    return entry({
      ai: `Toolkit (${name}): layer crisp, laminate, leaven — pastry/bread as crunch or rise.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Layer + butter → Shatter crust → Pie, baklava",
        "Bread / coat → Crunch → Fry, bake",
        "Starter hydrate → Rise → Bread, pancake",
        "Blind bake → Shell → Quiche, tart",
        "",
        "Roles: structure · crunch · rise"
      ),
    });
  return null;
}

/** @param {{ai:string,toolkit:string}} o */
function entry(o) {
  return `{ingredientToolkitAi:"${esc(o.ai)}",ingredientToolkit:"${esc(o.toolkit)}"}`;
}

function protein(name, n, cat) {
  if (/\bground\b/i.test(n))
    return entry({
      ai: `Toolkit (${name}): brown crumbles/patties; sauce body; filling binder; spice carrier — already minced so surface area is your speed lever.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Brown crumble → Maillard bits → Sauce, taco, rice",
        "Patty / ball → Even cook → Burger, meatball",
        "Raw mix-in → Binder + fat → Dumpling, loaf",
        "Season heavy → Flavor carrier → Chili, ragu",
        "",
        "Roles: fat + protein · quick cook"
      ),
    });
  if (/salmon|cod|halibut|sea bass|mahi|swordfish|fillet/i.test(n) && !/tuna/i.test(n))
    return entry({
      ai: `Toolkit (${name}): skin sear, steam, poach, flake — fish as delicate protein + optional crisp skin; overcooking kills the role.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Pan-sear skin-down → Crisp + moist → Plate fish",
        "Steam / gentle heat → Even gentle → Health-forward",
        "Flake → Tender pieces → Salad, cake, taco",
        "Dice raw (if safe) → Tartare / poke → Cold apps",
        "Citrus / butter finish → Bright / rich → Sauce tie-in",
        "",
        "Roles: protein · delicate texture"
      ),
    });
  if (/tuna/i.test(n))
    return entry({
      ai: `Toolkit (${name}): rare sear or raw slice — minimal heat; high quality + safety first.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Rare sear → Crust, cool center → Steak style",
        "Raw slice → Silky → Sashimi / poke",
        "Dice mix → Tartare base → App",
        "Well-done → Dry · avoid unless intentional",
        "",
        "Roles: meaty fish · minimal cook"
      ),
    });
  if (/shrimp|scallop|mussel|clam|lobster|crab/i.test(n))
    return entry({
      ai: `Toolkit (${name}): quick high heat or gentle steam — protein as snap/tender bite; chop for filling if needed.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Sear / grill → Caramel shell → Main protein",
        "Steam / simmer → Juicy → Broth, pasta",
        "Chop / fold → Pieces → Filling, fried rice",
        "Shell stock (if applicable) → Depth → Bisque, sauce",
        "",
        "Roles: briny protein · fast window"
      ),
    });
  if (/squid|octopus/i.test(n))
    return entry({
      ai: `Toolkit (${name}): flash hot OR long tender — avoid the rubber middle; char after tenderize.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Flash fry / sear → Snappy tender → App, salad",
        "Long braise → Soft → Stew, pasta",
        "Slice rings → Even cook → Fry, grill",
        "",
        "Roles: seafood protein · technique-sensitive"
      ),
    });
  if (/tofu/i.test(n))
    return entry({
      ai: `Toolkit (${name}): press, sear, crumble, silken gentle — soy protein as canvas or soft element.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Press + sear → Crust → Bowls, stir-fry",
        "Crumble → Filling texture → Taco, scramble",
        "Silken gentle → Custardy → Soup, sauce body",
        "Marinate → Flavor through → Grill",
        "",
        "Roles: protein / canvas"
      ),
    });
  if (/tempeh|seitan/i.test(n))
    return entry({
      ai: `Toolkit (${name}): slice sear, crumble, simmer in sauce — chewy protein that needs flavor paths.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Slice + sear → Crust → Sandwich, bowl",
        "Crumble → Brown bits → Sauce, filling",
        "Braise in sauce → Moist → Curry, stew",
        "",
        "Roles: plant protein · chew"
      ),
    });
  if (/steak|ribeye|flank|skirt/i.test(n))
    return entry({
      ai: `Toolkit (${name}): sear whole, slice thin flash, chop cheesesteak — steak identity vs sandwich filling tradeoffs.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Thick sear / grill → Juicy center → Plate steak",
        "Thin slice + flash → Fast tender bite → Stir-fry, taco",
        "Chop → Tenderized pieces → Cheesesteak, rice bowl",
        "Slice raw (if safe) → Carpaccio → App",
        "",
        "Roles: beef protein · grain direction matters"
      ),
    });
  if (/brisket|short rib|oxtail|ribs|belly/i.test(n) && !/pork chop/i.test(n))
    return entry({
      ai: `Toolkit (${name}): collagen cut — slice/grind/shave vs long braise; form defines eating experience (honest time).`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Shave / pull → Soft strands → Taco, sandwich",
        "Grind → Filling / patty → Fast chew fix",
        "Dice + braise → Partial tender → Chili, stew",
        "Low slice sear → Crust bite → Thin only",
        "Render trim fat → Cooking medium → Flavor base",
        "",
        "Roles: rich protein · time-dependent"
      ),
    });
  if (/chicken breast|turkey breast/i.test(n))
    return entry({
      ai: `Toolkit (${name}): slice, dice, grind, cutlet, poach-shred — lean white meat as fast protein vs soft filler.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Slice thin → Fast protein → Stir-fry, sear",
        "Pound cutlet → Even thin → Schnitzel-style",
        "Dice → Even bowl pieces → Fried rice, pasta",
        "Grind → Lean filling → Meatball, dumpling",
        "Poach + shred → Soft → Salad, sandwich",
        "",
        "Roles: lean anchor · dries if mishandled"
      ),
    });
  if (/chicken thigh|wings/i.test(n))
    return entry({
      ai: `Toolkit (${name}): sear skin, confit-ish braise, strip — dark poultry as forgiving fat + crisp.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Skin-down sear → Crisp skin → Plate",
        "Bone-in roast / braise → Juicy pull → Bowl",
        "Strip / dice → Fast pieces → Stir-fry, taco",
        "",
        "Roles: juicy poultry · flavor fat"
      ),
    });
  if (/whole chicken|cornish|hen/i.test(n))
    return entry({
      ai: `Toolkit (${name}): breakdown beats whole-roast on short clock — parts sear, breast slice, leg braise.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Joint → Parts cook at different speeds → Even finish",
        "Breast slice → Portion protein → Salad, sandwich",
        "Leg / thigh braise → Tender → Stew, taco",
        "Carcass → Stock body → Sauce, soup (if time)",
        "",
        "Roles: whole bird · multiple products"
      ),
    });
  if (/pork chop|tenderloin|lamb|duck/i.test(n))
    return entry({
      ai: `Toolkit (${name}): medallion, butterfly, sear, quick braise — lean muscle as portion protein.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Medallion sear → Even disk → Plate",
        "Butterfly → Thin cutlet → Fast cook",
        "Slice strip → Stir-fry → Bowl",
        "Quick braise → Moist trade → Less crust",
        "",
        "Roles: tender muscle · easy to overcook"
      ),
    });
  if (/sausage|chorizo|kielbasa|andouille/i.test(n))
    return entry({
      ai: `Toolkit (${name}): render casing fat, crumble, slice coin — spiced fat as flavor engine.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Sear whole / coins → Crisp edge → Plate",
        "Crumble brown → Spiced fat → Sauce, rice",
        "Slice bias → Chewy bite → Pasta, stew",
        "",
        "Roles: spice · fat · protein"
      ),
    });
  if (/prosciutto|bacon/i.test(n))
    return entry({
      ai: `Toolkit (${name}): crisp for texture, raw wrap for salt, render fat for cooking medium.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Crisp → Crunch garnish → Salad, soup top",
        "Wrap / layer → Salt + fat → Proteins, veg",
        "Render → Flavored oil → Start sautés",
        "Chop fine → Umami bits → Finish",
        "",
        "Roles: salt · fat · crisp"
      ),
    });
  return entry({
    ai: `Toolkit (${name}): portion, sear/roast, slice against grain, sauce carry — define protein role (center, shred, filling).`,
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Portion / truss → Even cook → Plate anchor",
      "Sear / roast → Maillard + juice → Main",
      "Slice / shred → Service pieces → Sandwich, salad",
      "Dice / stew → Body → Chili, braise",
      "Fat skim / jus → Sauce body → Finish",
      "",
      "Roles: protein centerpiece"
    ),
  });
}

function byCategory(name, cat) {
  const n = name.toLowerCase();
  const tables = {
    "Baking & Bases": () =>
      entry({
        ai: `Toolkit (${name}): structure vs richness vs leavening — define if this SKU is body (flour), fat (butter), sweetener, egg bind, or hydrate.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Measure + hydrate → Structure → Dough, batter",
          "Cream / rub → Lamination / tenderness → Pastry",
          "Whip / fold → Air → Meringue, cake",
          "Melt / brown → Flavor fat → Finish, sauce",
          "",
          "Roles: structure · fat · sweet · bind"
        ),
      }),
    "Grains & Legumes": () =>
      entry({
        ai: `Toolkit (${name}): cook tender, purée, crisp, or thicken — starch/legume as body, binder, or salad chew.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Simmer → Tender grains/beans → Side, bowl base",
          "Mash / purée → Creamy body → Dip, soup",
          "Toast dry → Nutty → Salad, pilaf",
          "Fry / roast → Crisp shell → Garnish, snack",
          "Starch water / aquafaba → Thicken / bind → Sauce",
          "",
          "Roles: bulk · protein · starch"
        ),
      }),
    Aromatics: () =>
      entry({
        ai: `Toolkit (${name}): raw bite vs sweated base vs char — aromatics as front note or slow sweetness.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Dice / mince → Flavor base → Soffritto, mirepoix",
          "Sweat / caramelize → Sweet depth → Sauce, soup",
          "Char / roast → Smoke note → Salsa, purée",
          "Raw finish → Bright top → Salad, taco",
          "Pickle / quick brine → Acid snap → Condiment",
          "",
          "Roles: aroma · sweetness · heat"
        ),
      }),
    Vegetables: () =>
      entry({
        ai: `Toolkit (${name}): raw crunch, roast depth, purée body, or fry crisp — veg as texture + sugar + acid.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Raw / shave → Crunch → Salad, slaw",
          "Roast / char → Sweet + bitter → Side, purée",
          "Blanch / steam → Tender bright → Plate, pickle",
          "Purée / soup → Body → Sauce, bowl",
          "Fry / crisp → Garnish → Snack, topping",
          "",
          "Roles: texture · acid · sweetness"
        ),
      }),
    Fruits: () =>
      entry({
        ai: `Toolkit (${name}): raw freshness, juice/acid, caramelize, or compote — fruit as acid, sweet, or aromatic.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Raw / segment → Bright acid → Salad, finish",
          "Juice / zest → Aroma + tang → Dressing, cure",
          "Roast / grill → Caramel → Dessert, savory contrast",
          "Compote / jam → Sticky body → Spread, glaze",
          "Dice salsa → Sweet heat partner → Fish, pork",
          "",
          "Roles: acid · sugar · aroma"
        ),
      }),
    "Dairy & Cheese": () =>
      entry({
        ai: `Toolkit (${name}): melt, crisp, whip, crumble, or finish — dairy as fat, tang, or texture layer.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Melt → Bind / stretch → Pizza, gratin",
          "Crumble / shave → Salt burst → Salad, pasta",
          "Whip / fold → Air + fat → Frosting, mousse",
          "Pan-crisp (halloumi-style) → Crunch → Garnish",
          "Cultured tang → Balance richness → Sauce, dip",
          "",
          "Roles: fat · salt · tang"
        ),
      }),
    "Oils & Vinegars": () =>
      entry({
        ai: `Toolkit (${name}): cook medium vs acid hit vs emulsify — bottle as process (sear) or finish (acid/umami).`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Sear / fry medium → Heat transfer → Crust",
          "Acid finish → Brightness → Salad, fish",
          "Emulsify → Stable sauce → Vinaigrette, mayo",
          "Deglaze → Pan sauce → Meat juices",
          "Infuse / bloom → Carry flavor → Spices, aromatics",
          "",
          "Roles: fat · acid · umami"
        ),
      }),
    "Spices & Herbs": () =>
      entry({
        ai: `Toolkit (${name}): bloom in fat, toast dry, rub, or finish fresh — spice as base note vs top note.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Bloom in oil → Aromatic base → Curries, stews",
          "Toast dry → Nutty spice → Rubs, dhals",
          "Rub / crust → Surface flavor → Proteins",
          "Fresh finish → Bright herb → Plating",
          "Steep → Infused liquid → Cream, syrup",
          "",
          "Roles: aroma · heat · contrast"
        ),
      }),
    "Canned & Jarred": () =>
      entry({
        ai: `Toolkit (${name}): chop, purée, strain, or use liquid — pantry depth as fast umami/sour/sweet.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Chop / fold → Chunk body → Salsa, stew",
          "Purée → Smooth base → Sauce, soup",
          "Use brine / oil → Salt + flavor → Marinade",
          "Char / roast (if solid) → Depth → Dip",
          "Mix condiment → Balance → Sandwich, bowl",
          "",
          "Roles: umami · acid · convenience"
        ),
      }),
    "Nuts & Seeds": () =>
      entry({
        ai: `Toolkit (${name}): toast, butter, crust, or garnish — fat + crunch + optional cream body.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Toast → Fragrance → Salad, dessert",
          "Chop / crumble → Texture → Crust, topping",
          "Nut butter / cream → Body → Sauce, vegan dairy",
          "Pesto-style grind → Herb-fat paste → Pasta, dip",
          "Candy / brittle → Sweet crunch → Dessert garnish",
          "",
          "Roles: fat · crunch · richness"
        ),
      }),
    "Sweet Items": () =>
      entry({
        ai: `Toolkit (${name}): melt, whip, fold, or temper — sweet as structure, shine, or cloud.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Melt / temper → Stable ganache → Glaze, truffle",
          "Whip with dairy → Foam / mousse → Dessert",
          "Fold into batter → Structure balance → Cake",
          "Shave / chip → Texture top → Finish",
          "Infuse cream → Flavor carrier → Panna cotta",
          "",
          "Roles: sweet · fat · texture"
        ),
      }),
  };
  if (tables[cat]) return tables[cat]();
  return entry({
    ai: `Toolkit (${name}): assign a clear culinary job (texture, acid, body, protein) — avoid anonymous garnish.`,
    toolkit: lines(
      "Ingredient toolkit (transform → result → use)",
      "Define primary role → What it does on the plate",
      "Transform intentionally → Cut, cook, or mix method",
      "Pair functionally → Sauce, starch, acid balance",
      "",
      "Roles: (define per dish)"
    ),
  });
}

function generate(item) {
  const { name, cat } = item;
  const n = name.toLowerCase();
  if (CURATED[name]) return entry(CURATED[name]);
  if (cat === "Baking & Bases") {
    const b = bakingByName(name);
    if (b) return b;
  }
  if (cat === "Proteins") return protein(name, n, cat);

  // Fine-tune vegetables / fruits by keyword
  if (cat === "Vegetables") {
    if (/potato|yam|sweet potato|plantain/i.test(n))
      return entry({
        ai: `Toolkit (${name}): starch backbone — roast depth, mash body, fry crisp, or salad crunch.`,
        toolkit: lines(
          "Ingredient toolkit (transform → result → use)",
          "Roast / smash → Crisp edges → Side, bowl",
          "Mash / whip → Cream base → Puree, topping",
          "Fry / chip → Crunch → Snack, garnish",
          "Dice boil → Tender cubes → Stew, salad",
          "Grate / rosti → Crisp cake → Breakfast, side",
          "",
          "Roles: starch · comfort · texture"
        ),
      });
    if (/tomato|pepper|chile|squash|eggplant|zucchini|okra|cabbage|broccoli|cauliflower|kale|spinach|corn|asparagus|bean|peas|mushroom/i.test(n))
      return byCategory(name, cat);
  }
  if (cat === "Fruits" && /citrus|lemon|lime|orange|grapefruit|yuzu|blood/i.test(n))
    return entry({
      ai: `Toolkit (${name}): zest oils + juice acid — fruit as aromatic and brightness, not just sweetness.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Zest → Aromatic oil → Bake, syrup",
        "Juice → Acid balance → Fish, ceviche",
        "Segment → Clean pulp → Salad, dessert",
        "Caramelize peel / marmalade → Bitter-sweet → Finish",
        "",
        "Roles: acid · aroma"
      ),
    });

  if (cat === "Dairy & Cheese" && /milk|cream|yogurt|butter|creme|mascarpone|ricotta/i.test(n))
    return entry({
      ai: `Toolkit (${name}): enrich, tang, or set — dairy as fat, acid, or soft body.`,
      toolkit: lines(
        "Ingredient toolkit (transform → result → use)",
        "Whip / fold → Air + richness → Dessert, sauce",
        "Simmer / reduce → Body → Soup, pasta",
        "Culture tang → Balance → Marinade, dip",
        "Brown butter → Nutty fat → Finish, sauce",
        "",
        "Roles: fat · tang · cream"
      ),
    });

  return byCategory(name, cat);
}

// Items that already have inline toolkit in FULL_PANTRY — keep generator in sync OR strip inline later
const OUT = {};
for (const it of items) {
  OUT[it.name] = generate(it);
}

let js = "const INGREDIENT_TOOLKIT_BY_NAME={\n";
for (const it of items) {
  const e = OUT[it.name];
  js += `  "${it.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}":${e},\n`;
}
js += "};\n";

fs.writeFileSync("scripts/generated-ingredient-toolkit.mjs", js);
console.log("Wrote scripts/generated-ingredient-toolkit.mjs keys:", Object.keys(OUT).length);
