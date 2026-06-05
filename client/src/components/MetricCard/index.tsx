import React from 'react'
import { Card } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { formatNumber, formatPercent, formatCurrency } from '@shared/utils'

interface MetricCardProps {
  title: string
  value: number
  valueType?: 'number' | 'percent' | 'currency'
  change?: number
  icon?: React.ReactNode
  loading?: boolean
  onClick?: () => void
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  valueType = 'number',
  change,
  icon,
  loading,
  onClick
}) => {
  const formatValue = () => {
    switch (valueType) {
      case 'percent':
        return formatPercent(value)
      case 'currency':
        return formatCurrency(value)
      default:
        return formatNumber(value)
    }
  }

  const isPositive = change !== undefined && change >= 0

  return (
    <Card
      className="metric-card card-shadow"
      loading={loading}
      onClick={onClick}
      style={{ height: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="metric-label">{title}</div>
          <div className="metric-value">{formatValue()}</div>
          {change !== undefined && (
            <div className={`metric-change ${isPositive ? 'up' : 'down'}`}>
              {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              <span>{Math.abs(change * 100).toFixed(2)}%</span>
              <span style={{ color: 'rgba(0, 0, 0, 0.45)', marginLeft: 4 }}>环比</span>
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isPositive ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
            color: isPositive ? '#52c41a' : '#ff4d4f',
            fontSize: 24
          }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

export default MetricCard
