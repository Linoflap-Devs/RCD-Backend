export const BROKER_TRANSACTION_DIVISION_ID = 0

type BrokerCommissionLike = {
    brokerId?: number | null
}

type DistributionLike = {
    Distribution?: string | null
    DistributionCode?: string | null
    Position?: string | null
}

export const normalizeBrokerTransactionValue = (value?: string | null): string => {
    return value?.trim().toUpperCase() || ''
}

export const isBrokerTransactionDivision = (divisionID?: number | null): boolean => {
    return divisionID !== undefined
        && divisionID !== null
        && Number(divisionID) === BROKER_TRANSACTION_DIVISION_ID
}

export const hasHandsOffBrokerId = (commission: BrokerCommissionLike): boolean => {
    return commission.brokerId !== undefined
        && commission.brokerId !== null
        && Number(commission.brokerId) > 0
}

export const isBrokerDistribution = (row: DistributionLike): boolean => {
    const distribution = normalizeBrokerTransactionValue(row.Distribution)
    const code = normalizeBrokerTransactionValue(row.DistributionCode)
    const position = normalizeBrokerTransactionValue(row.Position)

    return distribution.includes('BROKER')
        || code.includes('BROKER')
        || code === 'BR'
        || position.includes('BROKER')
}

export const isHandsOffBrokerDistribution = (row: DistributionLike): boolean => {
    const distribution = normalizeBrokerTransactionValue(row.Distribution)
    const code = normalizeBrokerTransactionValue(row.DistributionCode)
    const position = normalizeBrokerTransactionValue(row.Position)

    if(distribution.includes('HANDS-OFF') || distribution.includes('HANDS OFF')){
        return true
    }

    if(code.includes('HANDS-OFF') || code.includes('HANDS OFF') || code === 'HOB'){
        return true
    }

    return isBrokerDistribution(row) && position !== '' && position !== 'BROKER'
}
