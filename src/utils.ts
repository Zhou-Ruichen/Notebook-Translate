/**
 * 工具函数模块
 */

/**
 * 检测文本中是否包含中文字符
 * 使用 Unicode 范围判断：\u4e00-\u9fa5 覆盖基本汉字
 * @param text 待检测的文本
 * @returns 如果包含中文字符返回 true，否则返回 false
 */
export function hasChinese(text: string): boolean {
    // 匹配中文字符的正则表达式
    const chineseRegex = /[\u4e00-\u9fa5]/;
    return chineseRegex.test(text);
}
