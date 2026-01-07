"""
百度地图API集成
需要配置的API密钥：BAIDU_MAP_AK
"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# 优先使用环境变量，如果没有则使用默认值（仅用于开发）
BAIDU_MAP_AK = os.getenv('BAIDU_MAP_AK')


class BaiduMapAPI:
    """百度地图API封装类"""
    
    BASE_URL = "https://api.map.baidu.com"
    
    def __init__(self, ak=None):
        self.ak = ak or BAIDU_MAP_AK
        if not self.ak:
            raise ValueError("请配置百度地图API密钥 (BAIDU_MAP_AK)")
    
    def geocoding(self, address):
        """
        地理编码：将地址转换为经纬度
        API文档：https://lbsyun.baidu.com/index.php?title=webapi/guide/webservice-geocoding
        
        参数：
            address: 地址字符串
        
        返回：
            {
                'latitude': float,
                'longitude': float,
                'address': str,
                'province': str,
                'city': str,
                'district': str
            }
        """
        url = f"{self.BASE_URL}/geocoding/v3/"
        params = {
            'address': address,
            'output': 'json',
            'ak': self.ak
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get('status') == 0:
                result = data.get('result', {})
                location = result.get('location', {})
                return {
                    'latitude': location.get('lat'),
                    'longitude': location.get('lng'),
                    'address': result.get('formatted_address', address),
                    'province': result.get('addressComponent', {}).get('province', ''),
                    'city': result.get('addressComponent', {}).get('city', ''),
                    'district': result.get('addressComponent', {}).get('district', '')
                }
            else:
                raise Exception(f"地理编码失败: {data.get('message', '未知错误')}")
        except Exception as e:
            raise Exception(f"调用百度地图API失败: {str(e)}")
    
    def reverse_geocoding(self, latitude, longitude):
        """
        逆地理编码：将经纬度转换为地址
        API文档：https://lbsyun.baidu.com/index.php?title=webapi/guide/webservice-geocoding
        
        参数：
            latitude: 纬度
            longitude: 经度
        
        返回：
            {
                'address': str,
                'province': str,
                'city': str,
                'district': str
            }
        """
        url = f"{self.BASE_URL}/reverse_geocoding/v3/"
        params = {
            'ak': self.ak,
            'output': 'json',
            'coordtype': 'wgs84ll',  # 坐标类型：GPS坐标
            'location': f"{latitude},{longitude}"
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get('status') == 0:
                result = data.get('result', {})
                address_component = result.get('addressComponent', {})
                return {
                    'address': result.get('formatted_address', ''),
                    'province': address_component.get('province', ''),
                    'city': address_component.get('city', ''),
                    'district': address_component.get('district', '')
                }
            else:
                raise Exception(f"逆地理编码失败: {data.get('message', '未知错误')}")
        except Exception as e:
            raise Exception(f"调用百度地图API失败: {str(e)}")
    
    def place_search(self, query, region=None, location=None):
        """
        地点搜索
        API文档：https://lbsyun.baidu.com/index.php?title=webapi/guide/webservice-placeapi
        
        参数：
            query: 搜索关键词
            region: 搜索区域（可选，如"北京"）
            location: 中心点坐标（可选，格式："纬度,经度"）
        
        返回：
            [
                {
                    'name': str,
                    'address': str,
                    'latitude': float,
                    'longitude': float,
                    'province': str,
                    'city': str,
                    'district': str
                },
                ...
            ]
        """
        # 方法1：尝试使用place/v2/search API
        url = f"{self.BASE_URL}/place/v2/search"
        params = {
            'query': query,
            'output': 'json',
            'ak': self.ak,
            'scope': 2,  # scope=2表示返回详细地址信息
            'page_size': 20,
            'page_num': 0
        }
        
        if region:
            params['region'] = region
        if location:
            params['location'] = location
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            # 如果返回错误，尝试降级方案：使用地理编码
            if data.get('status') != 0:
                error_msg = data.get('message', '未知错误')
                # 如果错误是"APP服务被禁用"或其他权限问题，使用地理编码作为降级方案
                if '禁用' in error_msg or '权限' in error_msg or data.get('status') in [200, 401]:
                    print(f"地点搜索API不可用，使用地理编码降级方案: {error_msg}")
                    return self._place_search_fallback(query, region)
                else:
                    raise Exception(f"地点搜索失败: {error_msg}")
            
            # 解析结果
            results = []
            for item in data.get('results', []):
                location_info = item.get('location', {})
                results.append({
                    'name': item.get('name', ''),
                    'address': item.get('address', ''),
                    'latitude': location_info.get('lat'),
                    'longitude': location_info.get('lng'),
                    'province': item.get('province', ''),
                    'city': item.get('city', ''),
                    'district': item.get('area', '')
                })
            return results
            
        except Exception as e:
            # 如果请求失败，尝试降级方案
            print(f"地点搜索请求失败，使用地理编码降级方案: {str(e)}")
            return self._place_search_fallback(query, region)
    
    def _place_search_fallback(self, query, region=None):
        """
        降级方案：使用地理编码API进行地址搜索
        当place_search API不可用时使用
        """
        try:
            # 构建搜索地址
            search_address = query
            if region:
                search_address = f"{region}{query}"
            
            # 使用地理编码API
            result = self.geocoding(search_address)
            
            # 返回格式与place_search一致
            return [{
                'name': query,
                'address': result.get('address', search_address),
                'latitude': result.get('latitude'),
                'longitude': result.get('longitude'),
                'province': result.get('province', ''),
                'city': result.get('city', ''),
                'district': result.get('district', '')
            }]
        except Exception as e:
            raise Exception(f"地理编码降级方案也失败: {str(e)}")
    
    def get_current_location_info(self, latitude, longitude):
        """
        获取当前位置的详细信息（结合逆地理编码）
        
        参数：
            latitude: 纬度
            longitude: 经度
        
        返回：
            包含完整位置信息的字典
        """
        location_info = self.reverse_geocoding(latitude, longitude)
        location_info['latitude'] = latitude
        location_info['longitude'] = longitude
        return location_info

