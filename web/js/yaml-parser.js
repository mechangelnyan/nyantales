/**
 * Minimal YAML parser for NyanTales story files.
 * Handles the subset of YAML used by stories: scalars, maps, lists,
 * multi-line strings (| and >), and nested structures.
 * 
 * We use js-yaml from CDN fallback or inline parsing.
 */

class YAMLParser {
  /**
   * Parse YAML text using js-yaml if available, otherwise fetch it.
   * For simplicity, we'll load js-yaml from CDN.
   */
  static async init() {
    if (window.jsyaml) return;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
      script.onload = () => {
        window.jsyaml = window.jsyaml || window['js-yaml'] || jsyaml;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  static parse(yamlText) {
    if (!window.jsyaml) {
      throw new Error('js-yaml not loaded');
    }
    return jsyaml.load(yamlText);
  }
}
