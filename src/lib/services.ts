import type { Service } from "@prisma/client";

/** A service as the API sends it: prices as numbers. They're stored as
 *  exact decimals (WEB-23), which JSON would turn into strings. */
export function serviceJson(service: Service) {
  return {
    ...service,
    priceUSD: service.priceUSD === null ? null : service.priceUSD.toNumber(),
    priceNGN: service.priceNGN === null ? null : service.priceNGN.toNumber()
  };
}
