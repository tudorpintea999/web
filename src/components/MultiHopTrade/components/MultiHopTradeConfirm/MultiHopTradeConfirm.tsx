import { Card, CardBody, CardHeader, Heading, Stack } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { swappers as swappersSlice } from 'state/slices/swappersSlice/swappersSlice'
import {
  selectActiveSwapperName,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { FirstHop } from './components/FirstHop'
import { Footer } from './components/Footer'
import { SecondHop } from './components/SecondHop'

const cardBorderRadius = { base: 'xl' }

export const MultiHopTradeConfirm = memo(() => {
  const dispatch = useAppDispatch()
  const swapperName = useAppSelector(selectActiveSwapperName)
  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const history = useHistory()

  const handleBack = useCallback(() => {
    dispatch(swappersSlice.actions.clear())
    history.push(TradeRoutePaths.Input)
  }, [dispatch, history])

  if (!firstHop || !swapperName) return null

  return (
    <SlideTransition>
      <Card flex={1} borderRadius={cardBorderRadius} width='full' padding={6}>
        <CardHeader px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Heading textAlign='center'>
              <Text translation='trade.confirmDetails' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <CardBody pb={0} px={0}>
          <Stack spacing={6}>
            <FirstHop
              tradeQuoteStep={firstHop}
              swapperName={swapperName}
              isMultiHopTrade={!!isMultiHopTrade}
            />
            {isMultiHopTrade && lastHop && (
              <SecondHop tradeQuoteStep={lastHop} swapperName={swapperName} />
            )}
          </Stack>
        </CardBody>
      </Card>
      <Footer />
    </SlideTransition>
  )
})
