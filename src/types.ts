export interface TestCase {
  input: string;
  output: string;
}

export interface Problem {
  contestId: string;
  index: string;
  code: string; // e.g. "2044A"
  title: string;
  timeLimit: string;
  memoryLimit: string;
  statement: string;
  inputSpecification: string;
  outputSpecification: string;
  sampleTests: TestCase[];
  note?: string;
  url: string;
  
  // Translated fields in Vietnamese
  translatedTitle?: string;
  translatedStatement?: string;
  translatedInputSpecification?: string;
  translatedOutputSpecification?: string;
  translatedNote?: string;
}
