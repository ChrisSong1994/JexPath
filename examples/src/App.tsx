import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Card, Button, Layout, Flex, Typography, message, Drawer, List, Tag, Space, Divider, Tooltip } from 'antd'
import { PlayCircleOutlined, QuestionCircleOutlined, ThunderboltOutlined } from '@ant-design/icons'
import JexPath from '@fett/jexpath'
import './App.css'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography

const initialJson = JSON.stringify({
  users: [
    { name: "John", age: 30, active: true },
    { name: "Jane", age: 25, active: false },
    { name: "Bob", age: 35, active: true }
  ],
  store: {
    book: [
      { category: "reference", author: "Nigel Rees", title: "Sayings of the Century", price: 8.95 },
      { category: "fiction", author: "Evelyn Waugh", title: "Sword of Honour", price: 12.99 },
      { category: "fiction", author: "Herman Melville", title: "Moby Dick", isbn: "0-553-21311-3", price: 8.99 },
      { category: "fiction", author: "J. R. R. Tolkien", title: "The Lord of the Rings", isbn: "0-395-19395-8", price: 22.99 }
    ],
    bicycle: {
      color: "red",
      price: 19.95
    }
  }
}, null, 2)

const initialExpression = "$.store.book[?(@.price < 10)].title"

const examples = [
  { label: "所有书籍", value: "$.store.book[*]" },
  { label: "第一本书", value: "$.store.book[0]" },
  { label: "价格 < 10 的书", value: "$.store.book[?(@.price < 10)]" },
  { label: "所有书名", value: "$.store.book[*].title" },
  { label: "书的数量", value: "SIZE($.store.book)" },
  { label: "替换字符串", value: "REPLACE('Hello World', 'World', 'JexPath')" },
  { label: "日期格式化", value: "DATE('2023-01-01', 'YYYY/MM/DD')" },
  { label: "JSON 解析", value: "PARSE_JSON('{\"a\":1}').a" },
  { label: "算术运算", value: "1 + 2 * 3" },
  { label: "逻辑运算", value: "true && false || true" },
];

function App() {
  const [jsonStr, setJsonStr] = useState(initialJson)
  const [expression, setExpression] = useState(initialExpression)
  const [result, setResult] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setResult("")

    try {
      // 1. Parse JSON
      let contextData
      try {
        contextData = JSON.parse(jsonStr)
      } catch (e: any) {
        throw new Error(`无效的 JSON 数据: ${e.message}`)
      }

      // 2. Initialize JexPath
      const jexPath = new JexPath(contextData)

      // 3. Validate & Run
      // Note: validate() returns boolean. If false, we want to know why.
      // We can just call run(), which will parse and throw if syntax is invalid.
      // Or we can explicitly check validate() first.
      if (!jexPath.validate(expression)) {
        // If we want the specific syntax error, we can try-catch the internal parser or just let run() throw it.
        // But since validate() catches the error and returns false, we lose the message if we only use validate().
        // So we will proceed to run() to capture the specific error message from the parser.
      }

      const res = await jexPath.run(expression)
      
      if (res === undefined) {
        setResult("undefined")
      } else {
        setResult(JSON.stringify(res, null, 2))
      }
      message.success('执行成功')

    } catch (e: any) {
      console.error(e)
      setError(e.message || String(e))
      message.error('执行失败')
    } finally {
      setLoading(false)
    }
  }

  const applyExample = (val: string) => {
    setExpression(val)
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Flex align="center" gap="small">
            <Title level={4} style={{ margin: 0 }}>JexPath 演练场</Title>
            <Tag color="blue">Beta</Tag>
        </Flex>
        <Button type="link" icon={<QuestionCircleOutlined />} onClick={() => setDrawerVisible(true)}>
            语法指南
        </Button>
      </Header>
      <Content className="playground-container">
        <Flex gap="middle" style={{ height: '100%' }}>
          {/* Left Panel: JSON Input */}
          <Card title="上下文数据 (JSON)" className="editor-card" style={{ flex: 1 }}>
            <Editor
              height="100%"
              defaultLanguage="json"
              value={jsonStr}
              onChange={(value) => setJsonStr(value || '')}
              options={{ 
                minimap: { enabled: false }, 
                scrollBeyondLastLine: false,
                fontSize: 14,
                automaticLayout: true
              }}
            />
          </Card>

          {/* Right Panel */}
          <Flex vertical gap="middle" style={{ flex: 1 }}>
            
            {/* Top: Expression Input */}
            <Card 
                title={
                    <Flex justify="space-between" align="center">
                        <span>JexPath 表达式</span>
                        <Tooltip title="点击快速应用示例">
                            <Space size={0}>
                                <ThunderboltOutlined style={{ color: '#faad14', marginRight: 8 }} />
                                <span style={{ fontSize: 12, color: '#888', fontWeight: 'normal' }}>快速示例</span>
                            </Space>
                        </Tooltip>
                    </Flex>
                } 
                className="editor-card" 
                style={{ flex: '0 0 240px' }} // Increased height for examples
                bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column' }}
            >
               <div style={{ flex: 1 }}>
                    <Editor
                        height="100%"
                        defaultLanguage="text"
                        value={expression}
                        onChange={(value) => setExpression(value || '')}
                        options={{ 
                            minimap: { enabled: false }, 
                            lineNumbers: 'off',
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            fontSize: 16,
                            automaticLayout: true
                        }}
                    />
               </div>
               <div style={{ padding: '8px 12px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>示例:</Text>
                    <Space wrap size={[4, 4]}>
                        {examples.map(ex => (
                            <Tag 
                                key={ex.label} 
                                color="cyan" 
                                style={{ cursor: 'pointer' }} 
                                onClick={() => applyExample(ex.value)}
                            >
                                {ex.label}
                            </Tag>
                        ))}
                    </Space>
               </div>
            </Card>

            {/* Middle: Actions */}
            <Button 
                type="primary" 
                icon={<PlayCircleOutlined />} 
                onClick={handleRun}
                loading={loading}
                size="large"
                block
                style={{ height: 48, fontSize: 16 }}
            >
                运行表达式
            </Button>

            {/* Bottom: Result Output */}
            <Card title="执行结果" className="editor-card" style={{ flex: 1 }}>
                {error ? (
                    <div className="output-error">{error}</div>
                ) : (
                    <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={result}
                        options={{ 
                            readOnly: true, 
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14,
                            automaticLayout: true
                        }}
                        className="output-success"
                    />
                )}
            </Card>
          </Flex>
        </Flex>
      </Content>

      <Drawer
        title="JexPath 语法指南"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
      >
        <Typography>
            <Title level={5}>基本访问</Title>
            <Paragraph>
                <ul>
                    <li><Text code>$</Text> : 根对象</li>
                    <li><Text code>$.prop</Text> : 访问属性</li>
                    <li><Text code>$['prop']</Text> : 访问属性（支持特殊字符）</li>
                    <li><Text code>$[0]</Text> : 访问数组元素</li>
                    <li><Text code>$[*]</Text> : 数组通配符</li>
                </ul>
            </Paragraph>
            <Divider />
            
            <Title level={5}>过滤器 (Filter)</Title>
            <Paragraph>
                格式：<Text code>[?(expression)]</Text>
                <ul>
                    <li><Text code>@</Text> : 当前节点</li>
                    <li><Text code>@.price &lt; 10</Text> : 价格小于 10</li>
                    <li>示例：<Text code>$.store.book[?(@.price &lt; 10)]</Text></li>
                </ul>
            </Paragraph>
            <Divider />

            <Title level={5}>内置函数</Title>
            <Paragraph>
                <ul>
                    <li><Text code>SIZE(val)</Text> : 获取长度</li>
                    <li><Text code>TRIM(str)</Text> : 去除首尾空格</li>
                    <li><Text code>DATE(val, fmt)</Text> : 日期格式化</li>
                    <li><Text code>REPLACE(str, search, replace)</Text> : 字符串替换</li>
                    <li><Text code>PARSE_JSON(str)</Text> : 解析 JSON 字符串</li>
                </ul>
            </Paragraph>
            <Divider />

            <Title level={5}>运算符</Title>
            <Paragraph>
                <ul>
                    <li>算术：<Text code>+ - * / % **</Text></li>
                    <li>比较：<Text code>== != &gt; &lt; &gt;= &lt;=</Text></li>
                    <li>逻辑：<Text code>&& || !</Text></li>
                    <li>条件：<Text code>condition ? true : false</Text></li>
                </ul>
            </Paragraph>
        </Typography>
      </Drawer>
    </Layout>
  )
}

export default App
