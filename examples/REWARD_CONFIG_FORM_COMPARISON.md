# 奖励配置表单三种版本对比

## 📊 版本对比表

| 特性 | 完整版 | 基础版 | 简化版 |
|------|-------|--------|--------|
| **代码行数** | ~150-200 行 | ~80-100 行 | ~50-60 行 |
| **动态添加** | ✅ 支持 | ✅ 支持 | ❌ 固定 3 个 |
| **动态删除** | ✅ 支持 | ✅ 支持 | ✅ 选择"无"清空 |
| **UI 精美度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **类型选择** | 图标按钮网格 | 下拉选择 | 下拉选择 |
| **公式支持** | ✅ 完整 | ✅ 完整 | ❌ 仅固定金额 |
| **学习曲线** | 中等 | 低 | 很低 |
| **适用场景** | 复杂需求 | 一般需求 | 简单需求 |

---

## 🎨 完整版（Full Version）

**文件**: `examples/reward-config-form-full.tsx`

### 特点
- ✅ 最灵活的配置方式
- ✅ 精美的卡片式 UI
- ✅ 图标按钮选择奖励类型
- ✅ 支持固定金额和公式两种模式
- ✅ 动态添加/删除配置项
- ✅ 空状态提示
- ✅ 向后兼容快速添加

### 代码量
- **约 150-200 行**

### 适用场景
- 需要配置多种奖励类型
- 需要灵活的公式计算
- 追求精美的 UI 体验
- 用户需要频繁添加/删除配置

### 预览效果
```
┌─────────────────────────────────────────┐
│ 奖励配置                    [+ 添加奖励] │
│ 可以为同一规则配置多种奖励类型          │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [删除]                              │ │
│ │                                     │ │
│ │ 奖励类型 *                          │ │
│ │ ┌──┐ ┌──┐ ┌──┐ ┌──┐                │ │
│ │ │💰│ │⭐│ │❤️│ │🎁│                │ │
│ │ │獎金│ │積分│ │愛心│ │禮物│          │ │
│ │ └──┘ └──┘ └──┘ └──┘                │ │
│ │                                     │ │
│ │ 💰 獎金 (元)                        │ │
│ │ [固定金额] [公式]                   │ │
│ │ ┌─────────────────────────────┐     │ │
│ │ │ 10                          │     │ │
│ │ └─────────────────────────────┘     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🔧 基础版（Basic Version）

**文件**: `examples/reward-config-form-basic.tsx`

### 特点
- ✅ 支持动态添加/删除
- ✅ 简洁实用的 UI
- ✅ 下拉选择奖励类型
- ✅ 支持固定金额和公式
- ✅ 基本的验证和提示

### 代码量
- **约 80-100 行**

### 适用场景
- 需要配置多种奖励类型
- 追求简洁实用的界面
- 不需要过于精美的 UI
- 平衡功能与复杂度

### 预览效果
```
┌─────────────────────────────────────────┐
│ 奖励配置                    [+ 添加奖励] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🎁 奖励 1                    [删除]  │ │
│ │                                     │ │
│ │ 奖励类型 *                          │ │
│ │ [选择奖励类型 ▼]                    │ │
│ │                                     │ │
│ │ [固定金额]    [公式]                │ │
│ │ ┌──────┐      ┌──────┐             │ │
│ │ │  10  │      │ G*0.1│             │ │
│ │ └──────┘      └──────┘             │ │
│ │                                     │ │
│ │ 💡 G=分数, P=百分比, M=满分         │ │
│ │ 单位: 元                            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 📝 简化版（Simple Version）

**文件**: `examples/reward-config-form-simple.tsx`

### 特点
- ✅ 固定 3 个配置项
- ✅ 最简单的 UI
- ✅ 下拉选择奖励类型
- ✅ 仅支持固定金额（无公式）
- ✅ 选择"无"可清空配置

### 代码量
- **约 50-60 行**

### 适用场景
- 只需要配置少量奖励类型（最多 3 种）
- 不需要公式计算
- 追求最简单的实现
- 快速开发

### 预览效果
```
┌─────────────────────────────────────────┐
│ 奖励配置                                │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [无 ▼]                              │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ [💰 獎金 ▼] [10] [元]               │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ [⭐ 積分 ▼] [5] [分]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 💡 最多可配置 3 种奖励类型              │
└─────────────────────────────────────────┘
```

---

## 🚀 使用建议

### 选择完整版，如果：
- 需要灵活的奖励配置
- 需要公式计算功能
- 追求精美的 UI
- 用户需要频繁管理配置

### 选择基础版，如果：
- 需要动态添加/删除
- 需要公式支持
- 追求简洁实用
- 平衡功能与复杂度

### 选择简化版，如果：
- 只需要配置少量奖励（≤3 种）
- 不需要公式计算
- 追求最简单的实现
- 快速开发需求

---

## 📦 集成方式

### 1. 在 SubjectRewardRulesManager.tsx 中使用

```typescript
import RewardConfigFormFull from '@/examples/reward-config-form-full'
// 或
import RewardConfigFormBasic from '@/examples/reward-config-form-basic'
// 或
import RewardConfigFormSimple from '@/examples/reward-config-form-simple'

// 在表单中替换原有的 reward_amount 输入
<RewardConfigFormFull
  rewardConfig={formData.reward_config}
  onChange={(config) => setFormData({ ...formData, reward_config: config })}
/>
```

### 2. 修改表单状态

```typescript
const [formData, setFormData] = useState({
  // ... 其他字段
  reward_config: [] as RewardConfigItem[],  // 新增
  reward_amount: '',  // 保留用于向后兼容
  reward_formula: '',  // 保留用于向后兼容
})
```

### 3. 提交时处理

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // 优先使用 reward_config
  const submitData = {
    // ... 其他字段
    reward_config: formData.reward_config.length > 0 
      ? formData.reward_config 
      : null,  // 如果为空，使用旧的 reward_amount
    reward_amount: formData.reward_config.length === 0 
      ? parseFloat(formData.reward_amount) 
      : 0,
    reward_formula: formData.reward_config.length === 0 
      ? formData.reward_formula 
      : null,
  }
  
  // 提交到 API
}
```

---

## 🔄 迁移现有规则

现有规则需要从 `reward_amount` 迁移到 `reward_config`：

```typescript
// 在加载规则时
useEffect(() => {
  if (editingRule) {
    // 如果有 reward_config，使用它
    if (editingRule.reward_config && Array.isArray(editingRule.reward_config)) {
      setFormData({
        ...formData,
        reward_config: editingRule.reward_config
      })
    } else {
      // 向后兼容：从 reward_amount 构建
      const moneyType = rewardTypes.find(rt => rt.type_key === 'money')
      if (moneyType && editingRule.reward_amount) {
        setFormData({
          ...formData,
          reward_config: [{
            type_id: moneyType.id,
            type_key: 'money',
            amount: editingRule.reward_amount,
            formula: editingRule.reward_formula || null,
            unit: moneyType.default_unit || '元'
          }]
        })
      }
    }
  }
}, [editingRule, rewardTypes])
```

---

## 📝 注意事项

1. **向后兼容**: 所有版本都支持从旧的 `reward_amount` 字段迁移
2. **验证**: 需要确保至少有一个配置项选择了类型
3. **API 更新**: 需要更新 API 路由以支持 `reward_config` 字段
4. **翻译**: 需要添加相应的翻译键到 `locales/zh-TW.json` 和 `locales/en.json`
