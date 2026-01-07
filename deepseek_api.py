"""
DeepSeek API集成
用于分析用户评价文本，提取关键点和关键词
需要配置的API密钥：DEEPSEEK_API_KEY
"""
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# 优先使用环境变量，如果没有则使用默认值（仅用于开发）
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')


class DeepSeekAPI:
    """DeepSeek API封装类"""
    
    BASE_URL = "https://api.deepseek.com/v1/chat/completions"
    
    def __init__(self, api_key=None):
        self.api_key = api_key or DEEPSEEK_API_KEY
        if not self.api_key:
            raise ValueError("请配置DeepSeek API密钥 (DEEPSEEK_API_KEY)")
    
    def analyze_review(self, text_review):
        """
        分析用户评价文本，提取关键点和关键词
        
        参数：
            text_review: 用户提交的文字评价
        
        返回：
            {
                'summary': str,  # AI凝练总结的关键点（和安全相关的）
                'keywords': list  # 关键词列表（2-10个）
            }
        """
        prompt = f"""请分析以下关于居住安全性的评价文本，完成以下任务：

1. 提取并凝练总结与安全相关的关键点（重点关注：夜间安全、社区氛围、公共秩序、交通便利、危机应对等方面）
2. 提取2-6个关键词（用逗号分隔）
3. 关键词尽量凝练简洁

评价文本：
{text_review}

请以JSON格式返回结果，格式如下：
{{
    "summary": "凝练总结的关键点（100字以内）",
    "keywords": ["关键词1", "关键词2", "关键词3", ...]
}}"""

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }
        
        data = {
            'model': 'deepseek-chat',
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': 0.3,
            'max_tokens': 500
        }
        
        try:
            response = requests.post(
                self.BASE_URL,
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                # 尝试解析JSON响应
                try:
                    # 提取JSON部分（可能包含markdown代码块）
                    if '```json' in content:
                        json_start = content.find('```json') + 7
                        json_end = content.find('```', json_start)
                        content = content[json_start:json_end].strip()
                    elif '```' in content:
                        json_start = content.find('```') + 3
                        json_end = content.find('```', json_start)
                        content = content[json_start:json_end].strip()
                    
                    parsed = json.loads(content)
                    return {
                        'summary': parsed.get('summary', ''),
                        'keywords': parsed.get('keywords', [])
                    }
                except json.JSONDecodeError:
                    # 如果无法解析JSON，尝试提取信息
                    return {
                        'summary': content[:200] if len(content) > 200 else content,
                        'keywords': self._extract_keywords_fallback(text_review)
                    }
            else:
                raise Exception(f"DeepSeek API调用失败: {response.status_code} - {response.text}")
        except Exception as e:
            # 如果API调用失败，返回降级处理结果
            return {
                'summary': f"评价内容：{text_review[:200]}",
                'keywords': self._extract_keywords_fallback(text_review)
            }
    
    def _extract_keywords_fallback(self, text):
        """降级处理：简单的关键词提取（当API失败时使用）"""
        # 简单的关键词提取逻辑
        safety_keywords = [
            '安全', '危险', '照明', '监控', '治安', '女性', '夜间', 
            '交通', '便利', '紧急', '报警', '社区', '氛围', '秩序'
        ]
        found_keywords = []
        for keyword in safety_keywords:
            if keyword in text:
                found_keywords.append(keyword)
        return found_keywords[:10] if found_keywords else ['安全评价']

