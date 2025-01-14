import { useEffect, useState } from 'react'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { TradeQuote } from 'lib/swapper/types'
import { selectSellAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { APPROVAL_POLL_INTERVAL_MILLISECONDS } from '../../constants'
import { checkApprovalNeeded } from '../helpers'

export const useIsApprovalNeeded = (tradeQuoteStep: TradeQuote['steps'][number]) => {
  const [isApprovalNeeded, setIsApprovalNeeded] = useState<boolean | undefined>(undefined)
  const { poll } = usePoll()
  const wallet = useWallet().state.wallet
  const sellAssetAccountId = useAppSelector(selectSellAccountId)

  useEffect(() => {
    poll({
      fn: async () => {
        if (!wallet) return
        const updatedIsApprovalNeeded = await checkApprovalNeeded(
          tradeQuoteStep,
          wallet,
          sellAssetAccountId ?? '',
        )
        setIsApprovalNeeded(updatedIsApprovalNeeded)
        return updatedIsApprovalNeeded
      },
      validate: isApprovalNeeded => !isApprovalNeeded,
      interval: APPROVAL_POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [poll, sellAssetAccountId, tradeQuoteStep, wallet])

  return { isApprovalNeeded }
}
