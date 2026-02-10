import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Card, Button, Layout, Flex, Typography, message } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import JexPath from '@fett/jexpath'
import './App.css'

const { Header, Content } = Layout
const { Title } = Typography

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

const initialExpression = "store.book[?(@.price < 10)].title"

function App() {
  const [jsonStr, setJsonStr] = useState(initialJson)
  const [expression, setExpression] = useState(initialExpression)
  const [result, setResult] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={4} style={{ margin: 0 }}>JexPath 演练场</Title>
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
            <Card title="JexPath 表达式" className="editor-card" style={{ flex: '0 0 150px' }}>
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
            </Card>

            {/* Middle: Actions */}
            <Button 
                type="primary" 
                icon={<PlayCircleOutlined />} 
                onClick={handleRun}
                loading={loading}
                size="large"
                block
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
    </Layout>
  )
}

export default App
