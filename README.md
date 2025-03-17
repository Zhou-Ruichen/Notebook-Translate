# Jupyter Notebook Markdown 英译汉

这个VSCode扩展允许你将Jupyter Notebook (.ipynb)文件中的英文Markdown单元格翻译成中文。

## 功能

- 一键翻译当前打开的Jupyter Notebook中的所有英文Markdown单元格
- 自动检测单元格语言，只翻译英文单元格
- 保留原始格式和Markdown标记

## 使用方法

1. 在VSCode中打开一个.ipynb文件
2. 通过以下任一方式运行翻译命令：
   - 右键单击编辑器，在上下文菜单中选择"翻译Notebook Markdown单元格 (英译汉)"
   - 按下Ctrl+Shift+P打开命令面板，输入并选择"翻译Notebook Markdown单元格 (英译汉)"

## 安装方法

### 从VSIX文件安装

1. 下载插件的VSIX文件
2. 在VSCode中，点击扩展视图图标
3. 点击"..."菜单，选择"从VSIX安装..."
4. 选择下载的VSIX文件

### 从源代码安装

1. 克隆这个仓库
2. 在项目根目录运行`npm install`
3. 运行`npm run compile`
4. 按下F5开始调试

## 注意事项

- 当前版本使用的是模拟翻译服务，实际应用中需要将其替换为真实的翻译API
- 翻译会直接修改当前文件，建议在翻译前备份原始文件
- 若单元格已包含中文内容，将跳过翻译

## 自定义翻译服务

要使用真实的翻译API（如百度翻译、有道翻译等），你需要修改`MockTranslationService`类中的`translate`方法。以下是一个使用百度翻译API的示例：

```typescript
import axios from 'axios';
import * as crypto from 'crypto';

class BaiduTranslationService implements TranslationService {
    private appid: string;
    private secret: string;
    
    constructor(appid: string, secret: string) {
        this.appid = appid;
        this.secret = secret;
    }
    
    async translate(text: string): Promise<string> {
        const salt = Date.now();
        const sign = crypto.createHash('md5').update(this.appid + text + salt + this.secret).digest('hex');
        
        try {
            const response = await axios.get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
                params: {
                    q: text,
                    from: 'en',
                    to: 'zh',
                    appid: this.appid,
                    salt: salt,
                    sign: sign
                }
            });
            
            if (response.data && response.data.trans_result) {
                return response.data.trans_result.map((item: any) => item.dst).join('\n');
            }
            
            throw new Error('Translation failed: ' + JSON.stringify(response.data));
        } catch (error) {
            console.error('Translation API error:', error);
            throw error;
        }
    }
}
```

## 待添加功能

- [ ] 添加支持多种翻译API的选项
- [ ] 增加翻译进度指示器
- [ ] 添加翻译历史记录
- [ ] 支持自定义翻译规则和术语表
- [ ] 添加批量处理多个文件的功能
