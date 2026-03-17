import { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Card,
  Button,
  Layout,
  Flex,
  Typography,
  message,
  Drawer,
  List,
  Tag,
  Space,
  Divider,
  Tooltip,
} from "antd";
import {
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import JexPath from "@fett/jexpath";
import "./App.css";

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const initialJson = JSON.stringify(
  {
    store: {
      name: "Tech & Read Store",
      location: "New York",
      isOpen: true,
      book: [
        {
          category: "reference",
          author: "Nigel Rees",
          title: "Sayings of the Century",
          price: 8.95,
          inStock: true,
        },
        {
          category: "fiction",
          author: "Evelyn Waugh",
          title: "Sword of Honour",
          price: 12.99,
          inStock: false,
        },
        {
          category: "fiction",
          author: "Herman Melville",
          title: "Moby Dick",
          isbn: "0-553-21311-3",
          price: 8.99,
          inStock: true,
        },
        {
          category: "fiction",
          author: "J. R. R. Tolkien",
          title: "The Lord of the Rings",
          isbn: "0-395-19395-8",
          price: 22.99,
          inStock: true,
        },
      ],
      bicycle: {
        color: "red",
        price: 19.95,
        features: ["lights", "bell"],
      },
      electronics: [
        {
          id: "e1",
          name: "Laptop",
          price: 999.99,
          tags: ["work", "tech"],
          specs: { ram: "16GB", storage: "512GB" },
        },
        {
          id: "e2",
          name: "Smartphone",
          price: 699.0,
          tags: ["tech", "mobile"],
          specs: { ram: "8GB", storage: "128GB" },
        },
      ],
      hardware: [
        { name: "Hammer", price: 15.0, weight: 1.5 },
        { name: "Drill", price: 85.0, weight: 2.2 },
      ],
    },
    users: [
      {
        id: "u1",
        name: "John",
        age: 30,
        active: true,
        roles: ["admin", "editor"],
        meta: '{"lastLogin": "2023-10-01"}',
      },
      {
        id: "u2",
        name: "Jane",
        age: 25,
        active: false,
        roles: ["viewer"],
        meta: '{"lastLogin": "2023-09-15"}',
      },
    ],
    orders: [
      {
        id: "o1",
        userId: "u1",
        items: [
          { productId: "e1", qty: 1 },
          { productId: "b1", qty: 2 },
        ],
        total: 1050.0,
        status: "shipped",
      },
      {
        id: "o2",
        userId: "u2",
        items: [{ productId: "b2", qty: 1 }],
        total: 12.99,
        status: "pending",
      },
    ],
    stats: {
      visits: 1024,
      rating: 4.5,
    },
    system: {
      version: "1.0.0",
      maintenanceWindow: {
        start: "2023-12-01T00:00:00Z",
        end: "2023-12-01T04:00:00Z",
      },
    },
  },
  null,
  2,
);

const initialExpression =
  "$.store.book[?(@.price < 10 && @.inStock == true)].title";

const examples = [
  { label: "所有书籍", value: "$.store.book[*]" },
  {
    label: "有库存的便宜书",
    value: "$.store.book[?(@.price < 10 && @.inStock == true)].title",
  },
  { label: "高价电子产品", value: "$.store.electronics[?(@.price > 800)]" },
  { label: "嵌套属性(内存)", value: "$.store.electronics[0].specs.ram" },
  {
    label: "订单过滤(Shipped)",
    value: "$.orders[?(@.status == 'shipped')].id",
  },
  { label: "打折计算", value: "$.store.bicycle.price * 0.9" },
  {
    label: "字符串拼接",
    value: "$.store.name + ' (' + $.store.location + ')'",
  },
  { label: "JSON 解析", value: "PARSE_JSON($.users[0].meta).lastLogin" },
  { label: "三元运算", value: "$.stats.visits > 1000 ? 'Popular' : 'Normal'" },
  {
    label: "日期格式化",
    value: "DATE($.system.maintenanceWindow.start, 'YYYY-MM-DD HH:mm')",
  },
  {
    label: "复杂逻辑",
    value: "$.users[0].active && $.users[0].roles[0] == 'admin'",
  },
  { label: "正则替换", value: "REPLACE($.store.name, /\\s+/, '_')" },
  { label: "MAPPING-简单键值映射", value: "MAPPING($.users[0].name, {'John': 'Johnny', 'Jane': 'Janet'})" },
  { label: "MAPPING-数组索引映射", value: "MAPPING($.users[0].age, [10, 20, 30, 40, 50])" },
  { label: "MAPPING-默认值映射", value: "MAPPING($.users[1].name, {'John': 'Admin', 'Jane': 'User'}, 'Guest')" },
  { label: "MAPPING-数字映射", value: "MAPPING($.users[0].age, {30: 'Thirty', 25: 'TwentyFive'})" },
];

function App() {
  const [jsonStr, setJsonStr] = useState(initialJson);
  const [expression, setExpression] = useState(initialExpression);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult("");

    try {
      // 1. Parse JSON
      let contextData;
      try {
        contextData = JSON.parse(jsonStr);
      } catch (e: any) {
        throw new Error(`无效的 JSON 数据: ${e.message}`);
      }

      // 2. Initialize JexPath
      const jexPath = new JexPath(contextData);

      // 3. Validate & Run
      if (!jexPath.validate(expression)) {
        // If we want the specific syntax error, we can try-catch the internal parser or just let run() throw it.
        // But since validate() catches the error and returns false, we lose the message if we only use validate().
        // So we will proceed to run() to capture the specific error message from the parser.
      }

      const res = await jexPath.run(expression);

      if (res === undefined) {
        setResult("undefined");
      } else {
        setResult(JSON.stringify(res, null, 2));
      }
      message.success("执行成功");
    } catch (e: any) {
      console.error(e);
      setError(e.message || String(e));
      message.error("执行失败");
    } finally {
      setLoading(false);
    }
  };

  const applyExample = (val: string) => {
    setExpression(val);
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          padding: "0 24px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Flex align="center" gap="small">
          <Title level={4} style={{ margin: 0 }}>
            JexPath 演练场
          </Title>
          <Tag color="blue">Beta</Tag>
        </Flex>
        <Button
          type="link"
          icon={<QuestionCircleOutlined />}
          onClick={() => setDrawerVisible(true)}
        >
          语法指南
        </Button>
      </Header>
      <Content className="playground-container">
        <Flex gap="middle" style={{ height: "100%" }}>
          {/* Left Panel: JSON Input */}
          <Card
            title="上下文数据 (JSON)"
            className="editor-card"
            style={{ flex: "0 0 40%" }}
          >
            <Editor
              height="100%"
              defaultLanguage="json"
              value={jsonStr}
              onChange={(value) => setJsonStr(value || "")}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                automaticLayout: true,
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
                      <ThunderboltOutlined
                        style={{ color: "#faad14", marginRight: 8 }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: "#888",
                          fontWeight: "normal",
                        }}
                      >
                        快速示例
                      </span>
                    </Space>
                  </Tooltip>
                </Flex>
              }
              className="editor-card"
              style={{ flex: "0 0 240px" }} // Increased height for examples
              bodyStyle={{
                padding: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1 }}>
                <Editor
                  height="100%"
                  defaultLanguage="text"
                  value={expression}
                  onChange={(value) => setExpression(value || "")}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: "off",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    fontSize: 16,
                    automaticLayout: true,
                  }}
                />
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fafafa",
                  borderTop: "1px solid #f0f0f0",
                }}
              >
                <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                  示例:
                </Text>
                <Space wrap size={[4, 4]}>
                  {examples.map((ex) => (
                    <Tag
                      key={ex.label}
                      color="cyan"
                      style={{ cursor: "pointer" }}
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
                    automaticLayout: true,
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
              <li>
                <Text code>$</Text> : 根对象
              </li>
              <li>
                <Text code>$.prop</Text> : 访问属性
              </li>
              <li>
                <Text code>$['prop']</Text> : 访问属性（支持特殊字符）
              </li>
              <li>
                <Text code>$[0]</Text> : 访问数组元素
              </li>
              <li>
                <Text code>$[*]</Text> : 数组通配符
              </li>
            </ul>
          </Paragraph>
          <Divider />

          <Title level={5}>过滤器 (Filter)</Title>
          <Paragraph>
            格式：<Text code>[?(expression)]</Text>
            <ul>
              <li>
                <Text code>@</Text> : 当前节点
              </li>
              <li>
                <Text code>@.price &lt; 10</Text> : 价格小于 10
              </li>
              <li>
                示例：<Text code>$.store.book[?(@.price &lt; 10)]</Text>
              </li>
            </ul>
          </Paragraph>
          <Divider />

          <Title level={5}>内置函数</Title>
          <Paragraph>
            <ul>
              <li>
                <Text code>SIZE(val)</Text> : 获取长度
              </li>
              <li>
                <Text code>TRIM(str)</Text> : 去除首尾空格
              </li>
              <li>
                <Text code>DATE(val, fmt)</Text> : 日期格式化
              </li>
              <li>
                <Text code>REPLACE(str, search, replace)</Text> : 字符串替换（支持正则）
              </li>
              <li>
                <Text code>PARSE_JSON(str)</Text> : 解析 JSON 字符串
              </li>
            </ul>
          </Paragraph>
          <Divider />

          <Title level={5}>运算符</Title>
          <Paragraph>
            <ul>
              <li>
                算术：<Text code>+ - * / % **</Text>
              </li>
              <li>
                比较：<Text code>== != &gt; &lt; &gt;= &lt;=</Text>
              </li>
              <li>
                逻辑：<Text code>&& || !</Text>
              </li>
              <li>
                条件：<Text code>condition ? true : false</Text>
              </li>
            </ul>
          </Paragraph>
        </Typography>
      </Drawer>
    </Layout>
  );
}

export default App;
