import type { Kiyafet } from '../db/types';
import type { Parca } from './tipler';

/** Motor için fotoğrafsız parça özeti. */
export function ozet(k: Kiyafet): Parca {
  const { foto: _f, kesit: _k, ...geri } = k;
  return geri;
}
