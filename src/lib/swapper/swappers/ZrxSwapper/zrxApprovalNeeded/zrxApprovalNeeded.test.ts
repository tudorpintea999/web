import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosAdapter, AxiosStatic } from 'axios'
import Web3 from 'web3'

import type { ApprovalNeededInput } from '../../../api'
import { setupDeps } from '../../utils/test-data/setupDeps'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { zrxServiceFactory } from '../utils/zrxService'
import { zrxApprovalNeeded } from './zrxApprovalNeeded'

const zrxService = zrxServiceFactory({ baseUrl: 'https://api.0x.org/' })

jest.mock('web3')
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
  })),
}))
jest.mock('axios-cache-adapter', () => ({
  setupCache: jest.fn().mockReturnValue({ adapter: {} as AxiosAdapter }),
}))

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(),
        })),
      },
    })),
  },
}))

jest.mock('../utils/zrxService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    zrxServiceFactory: () => axios.create(),
  }
})

describe('zrxApprovalNeeded', () => {
  const deps = setupDeps()
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress)),
  } as unknown as HDWallet
  ;(deps.adapter.getChainId as jest.Mock).mockReturnValue(KnownChainIds.EthereumMainnet)

  const { tradeQuote, sellAsset } = setupQuote()

  it('returns false if sellAsset assetId is ETH', async () => {
    const input = {
      quote: { ...tradeQuote, sellAsset: { ...sellAsset, assetId: 'eip155:1/slip44:60' } },
      wallet,
    }

    const maybeApprovalNeeded = await zrxApprovalNeeded(deps, input)
    expect(maybeApprovalNeeded.isOk()).toBe(true)
    expect(maybeApprovalNeeded.unwrap()).toEqual({ approvalNeeded: false })
  })

  it('throws an error if sellAsset chain is not ETH', async () => {
    const input = {
      quote: { ...tradeQuote, sellAsset: { ...sellAsset, chainId: '' } },
      wallet,
    }

    const maybeApprovalNeeded = await zrxApprovalNeeded(deps, input)
    expect(maybeApprovalNeeded.isErr()).toBe(true)
    expect(maybeApprovalNeeded.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: { buyAssetChainId: 'eip155:1', sellAssetChainId: '' },
      message: '[assertValidTradePair] - both assets must be on chainId eip155:1',
      name: 'SwapError',
    })
  })

  it('returns false if allowanceOnChain is greater than quote.sellAmount', async () => {
    const allowanceOnChain = '50'
    const data = { allowanceTarget: '10' }
    const input: ApprovalNeededInput<KnownChainIds.EthereumMainnet> = {
      quote: {
        ...tradeQuote,
        sellAmountBeforeFeesCryptoBaseUnit: '10',
        feeData: {
          chainSpecific: { gasPriceCryptoBaseUnit: '1000' },
          buyAssetTradeFeeUsd: '0',
          sellAssetTradeFeeUsd: '0',
          networkFeeCryptoBaseUnit: '0',
        },
      },
      wallet,
    }
    ;(deps.web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain),
        })),
      },
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(Ok({ data })))

    const maybeApprovalNeeded = await zrxApprovalNeeded(deps, input)
    expect(maybeApprovalNeeded.isOk()).toBe(true)
    expect(maybeApprovalNeeded.unwrap()).toEqual({
      approvalNeeded: false,
    })
  })

  it('returns true if allowanceOnChain is less than quote.sellAmount', async () => {
    const allowanceOnChain = '5'
    const data = { allowanceTarget: '10' }
    const input = {
      quote: {
        ...tradeQuote,
        sellAmount: '10',
        feeData: {
          chainSpecific: { gasPriceCryptoBaseUnit: '1000' },
          buyAssetTradeFeeUsd: '0',
          sellAssetTradeFeeUsd: '0',
          networkFeeCryptoBaseUnit: '0',
        },
      },
      wallet,
    }
    ;(deps.web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain),
        })),
      },
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    const maybeApprovalNeeded = await zrxApprovalNeeded(deps, input)
    expect(maybeApprovalNeeded.isOk()).toBe(true)
    expect(maybeApprovalNeeded.unwrap()).toEqual({
      approvalNeeded: true,
    })
  })
})
