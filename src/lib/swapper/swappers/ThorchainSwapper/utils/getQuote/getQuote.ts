import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import qs from 'qs'
import { baseUnitToPrecision, bn } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type {
  ThorchainSwapperDeps,
  ThornodeQuoteResponse,
  ThornodeQuoteResponseSuccess,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import {
  THORCHAIN_AFFILIATE_NAME,
  THORCHAIN_FIXED_PRECISION,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'

import { thorService } from '../thorService'

export const getQuote = async ({
  sellAsset,
  buyAssetId,
  sellAmountCryptoBaseUnit,
  receiveAddress,
  affiliateBps = '0',
  deps,
}: {
  sellAsset: Asset
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  receiveAddress: string
  affiliateBps?: string
  deps: ThorchainSwapperDeps
}): Promise<Result<ThornodeQuoteResponseSuccess, SwapErrorRight>> => {
  const buyPoolId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
  const sellPoolId = adapters.assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  const sellAmountCryptoPrecision = baseUnitToPrecision({
    value: sellAmountCryptoBaseUnit,
    inputExponent: sellAsset.precision,
  })
  // All THORChain pool amounts are base 8 regardless of token precision
  const sellAmountCryptoThorBaseUnit = bn(
    toBaseUnit(sellAmountCryptoPrecision, THORCHAIN_FIXED_PRECISION),
  )

  const queryString = qs.stringify({
    amount: sellAmountCryptoThorBaseUnit.toString(),
    from_asset: sellPoolId,
    to_asset: buyPoolId,
    destination: receiveAddress,
    affiliate_bps: affiliateBps,
    affiliate: THORCHAIN_AFFILIATE_NAME,
  })
  const { data } = await thorService.get<ThornodeQuoteResponse>(
    `${deps.daemonUrl}/lcd/thorchain/quote/swap?${queryString}`,
  )

  if ('error' in data && /not enough fee/.test(data.error)) {
    // TODO(gomes): How much do we want to bubble the error property up?
    // In other words, is the consumer calling getTradeRateBelowMinimum() in case of a sell amount below minimum enough,
    // or do we need to bubble the error up all the way so "web" is aware that the rate that was gotten was a below minimum one?
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate]: Sell amount is below the THOR minimum, cannot get a trade rate from Thorchain.`,
        code: SwapErrorType.TRADE_BELOW_MINIMUM,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )
  } else if ('error' in data) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate]: THORChain quote returned an error: ${data.error}`,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )
  } else {
    return Ok(data)
  }
}