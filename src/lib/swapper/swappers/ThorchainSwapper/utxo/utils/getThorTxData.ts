import type { Asset } from '@shapeshiftoss/asset-service'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import type { SwapErrorRight } from 'lib/swapper/api'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { getLimit } from 'lib/swapper/swappers/ThorchainSwapper/utils/getLimit/getLimit'
import { makeSwapMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/makeSwapMemo'

type GetThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerance: string
  destinationAddress: string
  xpub: string
  buyAssetTradeFeeUsd: string
  affiliateBps: string
}
type GetThorTxInfoReturn = Promise<
  Result<
    {
      opReturnData: string
      vault: string
      pubkey: string
    },
    SwapErrorRight
  >
>
type GetThorTxInfo = (args: GetThorTxInfoArgs) => GetThorTxInfoReturn

export const getThorTxInfo: GetThorTxInfo = async ({
  deps,
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippageTolerance,
  destinationAddress,
  xpub,
  buyAssetTradeFeeUsd,
  affiliateBps,
}) => {
  const maybeInboundAddress = await getInboundAddressDataForChain(
    deps.daemonUrl,
    sellAsset.assetId,
    false,
  )

  if (maybeInboundAddress.isErr()) return Err(maybeInboundAddress.unwrapErr())
  const inboundAddress = maybeInboundAddress.unwrap()
  const vault = inboundAddress.address

  const maybeLimit = await getLimit({
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerance,
    deps,
    buyAssetTradeFeeUsd,
    receiveAddress: destinationAddress,
    affiliateBps,
  })

  return maybeLimit.map(limit => {
    const memo = makeSwapMemo({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      limit,
      affiliateBps,
    })

    return {
      opReturnData: memo,
      vault,
      pubkey: xpub,
    }
  })
}
