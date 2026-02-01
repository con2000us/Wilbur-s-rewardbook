/**
 * 奖励配置表单预览页面
 * 展示三种版本的 UI 效果
 */

'use client'

import RewardConfigFormFull from '@/examples/reward-config-form-full'
import RewardConfigFormBasic from '@/examples/reward-config-form-basic'
import RewardConfigFormSimple from '@/examples/reward-config-form-simple'

export default function RewardConfigPreviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎁 奖励配置表单预览
          </h1>
          <p className="text-gray-600">
            三种版本的 UI 效果对比
          </p>
        </div>

        {/* 完整版 */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-2">
              ✨ 完整版（Full Version）
            </h2>
            <p className="text-gray-600 text-sm">
              约 150-200 行代码 | 最灵活，支持动态添加/删除，UI 精美，功能完整
            </p>
          </div>
          <div className="border-2 border-purple-200 rounded-xl p-6 bg-gradient-to-r from-purple-50 to-blue-50">
            <RewardConfigFormFull
              rewardConfig={[]}
              onChange={(config) => {
                console.log('Full version config:', config)
              }}
            />
          </div>
        </section>

        {/* 基础版 */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-2">
              🔧 基础版（Basic Version）
            </h2>
            <p className="text-gray-600 text-sm">
              约 80-100 行代码 | 支持动态添加/删除，UI 简单实用，功能完整
            </p>
          </div>
          <div className="border-2 border-blue-200 rounded-xl p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
            <RewardConfigFormBasic
              rewardConfig={[]}
              onChange={(config) => {
                console.log('Basic version config:', config)
              }}
            />
          </div>
        </section>

        {/* 简化版 */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              📝 简化版（Simple Version）
            </h2>
            <p className="text-gray-600 text-sm">
              约 50-60 行代码 | 固定 3 个配置项，无需动态添加/删除，UI 简洁
            </p>
          </div>
          <div className="border-2 border-green-200 rounded-xl p-6 bg-gradient-to-r from-green-50 to-emerald-50">
            <RewardConfigFormSimple
              rewardConfig={[]}
              onChange={(config) => {
                console.log('Simple version config:', config)
              }}
            />
          </div>
        </section>

        {/* 说明 */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            📋 使用说明
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-lg mb-2">✨ 完整版</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>图标按钮网格选择奖励类型</li>
                <li>卡片式设计，带颜色区分</li>
                <li>固定金额/公式切换按钮</li>
                <li>动态添加/删除配置项</li>
                <li>适合：需要灵活配置、追求精美 UI</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">🔧 基础版</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>下拉选择奖励类型</li>
                <li>简洁的卡片布局</li>
                <li>固定金额和公式并排输入</li>
                <li>动态添加/删除配置项</li>
                <li>适合：平衡功能与复杂度</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">📝 简化版</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>固定 3 个配置项</li>
                <li>下拉选择 + 数字输入</li>
                <li>选择"无"可清空配置</li>
                <li>仅支持固定金额（无公式）</li>
                <li>适合：简单需求、快速开发</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
