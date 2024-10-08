import { CommonOptions } from "https://deno.land/x/esbuild@v0.17.19/mod.js";
import {
  build,
  denoPlugins,
  exists,
  parseJsonC,
  resolve,
  stop,
  toFileUrl,
} from "./deps.ts";

type EsbuildOptions = {
  noBundle: boolean;
};

export async function bundleByEsbuild(
  path: string,
  {
    noBundle,
  }: EsbuildOptions,
): Promise<string> {
  const importMapFile = getImportMap();
  let importMapURL: URL | undefined;
  if (importMapFile) {
    importMapURL = toFileUrl(resolve(importMapFile));
  }

  // @NekoMaru76: option tsconfig in esbuild's build doesn't work, so I did this
  let jsx: CommonOptions["jsx"];
  let jsxFactory: CommonOptions["jsxFactory"];
  let jsxFragment: CommonOptions["jsxFragment"];
  let jsxDev: CommonOptions["jsxDev"];
  let jsxImportSource: CommonOptions["jsxImportSource"];

  const tsconfigFile = await getTsconfig();

  if (tsconfigFile) {
    const config = <{
      compilerOptions: {
        jsx: CommonOptions["jsx"];
        jsxFactory: CommonOptions["jsxFactory"];
        jsxFragmentFactory: CommonOptions["jsxFragment"];
        jsxDev: CommonOptions["jsxDev"];
        jsxImportSource: CommonOptions["jsxImportSource"];
      };
    }> parseJsonC(await Deno.readTextFile(tsconfigFile));

    if (
      config && typeof config === "object" &&
      config.compilerOptions &&
      typeof config.compilerOptions === "object"
    ) {
      jsx = config.compilerOptions.jsx;
      jsxDev = config.compilerOptions.jsxDev;
      jsxFactory = config.compilerOptions.jsxFactory;
      jsxFragment = config.compilerOptions.jsxFragmentFactory;
      jsxImportSource = config.compilerOptions.jsxImportSource;
    }
  }

  const bundle = await build({
    entryPoints: [toFileUrl(resolve(path)).href],
    plugins: [
      ...denoPlugins({
        importMapURL: importMapURL?.href,
      }),
    ],
    bundle: !noBundle,
    write: false,
    jsx,
    jsxFactory,
    jsxDev,
    jsxFragment,
    jsxImportSource,
  });

  await stop();

  return bundle.outputFiles![0].text;
}

let _importMap: string | undefined;

export function setImportMap(importMap: string) {
  _importMap = importMap;
}

export function getImportMap() {
  return _importMap;
}

let _tsconfig: string | undefined;

export function setTsconfig(tsconfig: string) {
  _tsconfig = tsconfig;
}

export async function getTsconfig() {
  if (!_tsconfig) {
    if (
      await exists("./deno.json", {
        isReadable: true,
        isDirectory: false,
      })
    ) {
      return "./deno.json";
    }
    if (
      await exists("./deno.jsonc", {
        isReadable: true,
        isDirectory: false,
      })
    ) {
      return "./deno.jsonc";
    }
    if (
      await exists("./tsconfig.json", {
        isReadable: true,
        isDirectory: false,
      })
    ) {
      return "./tsconfig.json";
    }
  }

  return _tsconfig;
}
