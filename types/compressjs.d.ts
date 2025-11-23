declare module "compressjs" {
  export const Lzp: {
    compress(data: number[] | Uint8Array): number[];
    decompress(data: number[] | Uint8Array): number[];
  };

  export const Lzp3: {
    compress(data: number[] | Uint8Array): number[];
    decompress(data: number[] | Uint8Array): number[];
  };

  export function compressFile(
    data: number[] | Uint8Array,
    algorithm:
      | { compress: (data: number[] | Uint8Array) => number[] }
      | { compress: (data: number[] | Uint8Array) => number[] },
  ): number[];

  export function decompressFile(
    data: number[] | Uint8Array,
    algorithm:
      | { decompress: (data: number[] | Uint8Array) => number[] }
      | { decompress: (data: number[] | Uint8Array) => number[] },
  ): number[];
}
