import { BLOCKFROST_API_KEY, BLOCKFROST_API_URL } from './constants';

/**
 * Fetch Cardano protocol parameters from Blockfrost (preview)
 */
export async function fetchCardanoParams() {
  const res = await fetch(BLOCKFROST_API_URL + "/epochs/latest/parameters", {
    headers: {
      project_id: BLOCKFROST_API_KEY,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch params: ${res.status}`);
  return res.json();
}
