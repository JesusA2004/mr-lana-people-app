/**
 * Doble de `expo-file-system` en memoria para las pruebas de documentos: guarda
 * los archivos «en disco» en un mapa para poder afirmar qué queda abandonado.
 */
export const discoFalso = new Map<string, Uint8Array>();
export const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

function unir(partes: unknown[]): string {
  return partes.map((p) => (p && typeof p === 'object' && 'uri' in p ? (p as { uri: string }).uri.replace(/\/$/, '') : String(p))).join('/');
}

export class FakeFile {
  uri: string;
  constructor(...partes: unknown[]) {
    this.uri = unir(partes);
  }
  get name() {
    return this.uri.split('/').pop() ?? '';
  }
  get exists() {
    return discoFalso.has(this.uri);
  }
  get size() {
    return discoFalso.get(this.uri)?.length ?? 0;
  }
  get contentUri() {
    return `content://${this.uri}`;
  }
  delete() {
    discoFalso.delete(this.uri);
  }
  slice(inicio: number, fin: number) {
    const datos = discoFalso.get(this.uri) ?? new Uint8Array();
    return { arrayBuffer: async () => datos.slice(inicio, fin).buffer };
  }
  async move(destino: FakeFile) {
    if (destino.exists) throw new Error('destination exists');
    discoFalso.set(destino.uri, discoFalso.get(this.uri)!);
    discoFalso.delete(this.uri);
    this.uri = destino.uri;
  }
  async copy(destino: FakeFile) {
    discoFalso.set(destino.uri, discoFalso.get(this.uri)!);
  }
  async base64() {
    return 'UERG';
  }
  static descargaFalsa: (url: string, destino: FakeFile, opciones: { headers?: Record<string, string> }) => Promise<void> = async (_url, destino) => {
    discoFalso.set(destino.uri, PDF_BYTES);
  };
  static createDownloadTask(url: string, destino: FakeFile, opciones: { headers?: Record<string, string> }) {
    return {
      downloadAsync: async () => {
        await FakeFile.descargaFalsa(url, destino, opciones);
        return destino;
      },
    };
  }
}

export class FakeDirectory {
  uri: string;
  constructor(...partes: unknown[]) {
    this.uri = unir(partes);
  }
  get name() {
    return this.uri.split('/').pop() ?? '';
  }
  create() {}
  delete() {
    for (const clave of [...discoFalso.keys()]) if (clave.startsWith(`${this.uri}/`)) discoFalso.delete(clave);
  }
  list(): (FakeFile | FakeDirectory)[] {
    const hijos = new Map<string, FakeFile | FakeDirectory>();
    for (const clave of discoFalso.keys()) {
      if (!clave.startsWith(`${this.uri}/`)) continue;
      const [primero, ...resto] = clave.slice(this.uri.length + 1).split('/');
      hijos.set(primero!, resto.length ? new FakeDirectory(this.uri, primero) : new FakeFile(this.uri, primero));
    }
    return [...hijos.values()];
  }
}

export const fakeExpoFileSystem = {
  File: FakeFile,
  Directory: FakeDirectory,
  Paths: { cache: new FakeDirectory('file:///cache') },
  FileMode: { ReadOnly: 'r', WriteOnly: 'w' },
};
