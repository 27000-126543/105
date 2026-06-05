import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1890ff',
          borderRadius: 6,
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        components: {
          Layout: {
            headerBg: '#001529',
            headerHeight: 64,
            siderBg: '#001529'
          },
          Menu: {
            darkItemBg: '#001529',
            darkSubMenuItemBg: '#000c17',
            darkItemSelectedBg: '#1890ff'
          }
        }
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
)
