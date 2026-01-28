// vite.config.ts
import path from "path";
import { defineConfig, loadEnv } from "file:///D:/Oryntix/Git/Urokisami/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Oryntix/Git/Urokisami/node_modules/@vitejs/plugin-react/dist/index.js";
import { nodePolyfills } from "file:///D:/Oryntix/Git/Urokisami/node_modules/vite-plugin-node-polyfills/dist/index.js";
var __vite_injected_original_dirname = "D:\\Oryntix\\Git\\Urokisami";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    // ... server and preview config ... 
    server: {
      port: 3e3,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/google-api": {
          target: "http://localhost:3005",
          // Route to our local proxy server
          changeOrigin: true,
          secure: false,
          ws: true
          // We don't need to rewrite here because proxy-server.mjs handles /google-api prefix
          // and we want to use the SOCKS agent logic in proxy-server.mjs
        }
      }
    },
    preview: {
      port: 3e3,
      host: "0.0.0.0",
      allowedHosts: ["urokisami.ru", "www.urokisami.ru", "localhost"],
      proxy: {
        "/google-api": {
          target: "http://localhost:3005",
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    },
    plugins: [
      react(),
      nodePolyfills({
        // To exclude specific polyfills, add them to this list.
        exclude: [],
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true
      })
    ],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, ".")
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxPcnludGl4XFxcXEdpdFxcXFxVcm9raXNhbWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXE9yeW50aXhcXFxcR2l0XFxcXFVyb2tpc2FtaVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovT3J5bnRpeC9HaXQvVXJva2lzYW1pL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5pbXBvcnQgeyBIdHRwc1Byb3h5QWdlbnQgfSBmcm9tICdodHRwcy1wcm94eS1hZ2VudCc7XHJcblxyXG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgJy4nLCAnJyk7XHJcblxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgLy8gLi4uIHNlcnZlciBhbmQgcHJldmlldyBjb25maWcgLi4uIFxyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgIHBvcnQ6IDMwMDAsXHJcbiAgICAgIGhvc3Q6ICcwLjAuMC4wJyxcclxuICAgICAgYWxsb3dlZEhvc3RzOiB0cnVlLFxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgICcvZ29vZ2xlLWFwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwNScsIC8vIFJvdXRlIHRvIG91ciBsb2NhbCBwcm94eSBzZXJ2ZXJcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgICB3czogdHJ1ZSxcclxuICAgICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gcmV3cml0ZSBoZXJlIGJlY2F1c2UgcHJveHktc2VydmVyLm1qcyBoYW5kbGVzIC9nb29nbGUtYXBpIHByZWZpeFxyXG4gICAgICAgICAgLy8gYW5kIHdlIHdhbnQgdG8gdXNlIHRoZSBTT0NLUyBhZ2VudCBsb2dpYyBpbiBwcm94eS1zZXJ2ZXIubWpzXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgcHJldmlldzoge1xyXG4gICAgICBwb3J0OiAzMDAwLFxyXG4gICAgICBob3N0OiAnMC4wLjAuMCcsXHJcbiAgICAgIGFsbG93ZWRIb3N0czogWyd1cm9raXNhbWkucnUnLCAnd3d3LnVyb2tpc2FtaS5ydScsICdsb2NhbGhvc3QnXSxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2dvb2dsZS1hcGknOiB7XHJcbiAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDUnLFxyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICAgIHdzOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLFxyXG4gICAgICBub2RlUG9seWZpbGxzKHtcclxuICAgICAgICAvLyBUbyBleGNsdWRlIHNwZWNpZmljIHBvbHlmaWxscywgYWRkIHRoZW0gdG8gdGhpcyBsaXN0LlxyXG4gICAgICAgIGV4Y2x1ZGU6IFtdLFxyXG4gICAgICAgIC8vIFdoZXRoZXIgdG8gcG9seWZpbGwgYG5vZGU6YCBwcm90b2NvbCBpbXBvcnRzLlxyXG4gICAgICAgIHByb3RvY29sSW1wb3J0czogdHJ1ZSxcclxuICAgICAgfSksXHJcbiAgICBdLFxyXG4gICAgZGVmaW5lOiB7XHJcbiAgICAgICdwcm9jZXNzLmVudi5BUElfS0VZJzogSlNPTi5zdHJpbmdpZnkoZW52LkdFTUlOSV9BUElfS0VZKSxcclxuICAgICAgJ3Byb2Nlc3MuZW52LkdFTUlOSV9BUElfS0VZJzogSlNPTi5zdHJpbmdpZnkoZW52LkdFTUlOSV9BUElfS0VZKVxyXG4gICAgfSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuJyksXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrUSxPQUFPLFVBQVU7QUFDblIsU0FBUyxjQUFjLGVBQWU7QUFDdEMsT0FBTyxXQUFXO0FBR2xCLFNBQVMscUJBQXFCO0FBTDlCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sTUFBTSxRQUFRLE1BQU0sS0FBSyxFQUFFO0FBR2pDLFNBQU87QUFBQTtBQUFBLElBRUwsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsT0FBTztBQUFBLFFBQ0wsZUFBZTtBQUFBLFVBQ2IsUUFBUTtBQUFBO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsVUFDUixJQUFJO0FBQUE7QUFBQTtBQUFBLFFBR047QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sY0FBYyxDQUFDLGdCQUFnQixvQkFBb0IsV0FBVztBQUFBLE1BQzlELE9BQU87QUFBQSxRQUNMLGVBQWU7QUFBQSxVQUNiLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxVQUNkLFFBQVE7QUFBQSxVQUNSLElBQUk7QUFBQSxRQUNOO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLGNBQWM7QUFBQTtBQUFBLFFBRVosU0FBUyxDQUFDO0FBQUE7QUFBQSxRQUVWLGlCQUFpQjtBQUFBLE1BQ25CLENBQUM7QUFBQSxJQUNIO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTix1QkFBdUIsS0FBSyxVQUFVLElBQUksY0FBYztBQUFBLE1BQ3hELDhCQUE4QixLQUFLLFVBQVUsSUFBSSxjQUFjO0FBQUEsSUFDakU7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLEdBQUc7QUFBQSxNQUNsQztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
