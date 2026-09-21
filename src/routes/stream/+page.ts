import { getStreamEntries } from '$lib/utils/posts';
export const load = async () => ({ entries: await getStreamEntries() });
