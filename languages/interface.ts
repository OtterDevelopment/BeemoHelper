import { readFileSync, writeFile } from "fs";

const enUS: Record<string, string> = JSON.parse(
    readFileSync("./languages/en-US.json").toString()
);

const interfaceMap = new Map<string, string[]>();

Object.entries(enUS).forEach(([key, value]) => {
    interfaceMap.set(
        key,
        typeof value === "string"
            ? [...value.matchAll(/{{(.*?)}}/g)].map(match => match[1])
            : []
    );
});

writeFile(
    "./typings/language.d.ts",
    `export interface LanguageValues {\n${[...interfaceMap.entries()]
        .map(
            ([key, value]) =>
                `${key}: {${value.map(v => `${v}: any`).join(", ")}}`
        )
        .join(",\n")}\n}`,
    () => {}
);

const interfaceArray = [...interfaceMap];

// eslint-disable-next-line no-console
console.log(
    `Generated an interface for ${interfaceArray.length} keys, ${
        interfaceArray.filter(([_, value]) => value.length > 0).length
    } of which have typed objects.`
);
