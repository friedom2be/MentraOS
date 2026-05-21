import type {ScriptSourceType} from '../domain/types';

export type SummarizeFn = (text: string, sourceType: ScriptSourceType) => Promise<string>;

export const summarizeText: SummarizeFn = async (text) => text;
