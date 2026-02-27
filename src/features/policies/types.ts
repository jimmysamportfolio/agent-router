export interface PolicyMatch {
  sourceFile: string;
  content: string;
  similarity: number;
}

export interface PolicySearchRow {
  source_file: string;
  content: string;
  similarity: number;
}
