import { getStreamEntries } from '#lib/utils/posts.ts';
export const load = async () => ({ entries: await getStreamEntries() });
