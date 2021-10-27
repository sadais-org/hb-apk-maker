### 介绍

主要用于 uni-app 工程项目打包 apk。

### 安装

全局安装：`npm i -g hb-apk-maker`  
非全局安装：`npm i -D hb-apk-maker`

### 帮助

hb-apk-maker -h // 注意如果是局部安装 指令前面需要添加 npx

输出：

```
npx hb-apk-maker -h
Usage: index [options]

Options:
  -V, --version        output the version number
  -m, --mode [mode]    模式选择 (choices: "debug", "release", default: "debug")
  -c, --config <path>  build.json path (default: "build.json")
  -h, --help           display help for command
```

### 相对路径

涉及到的路径，若为相对路径，则都是相对于**项目根目录**

### build.json

在需要使用此命令打包 apk 的项目更目录下新建一个 `build.json`、`sign.keystore`

```
{
  "android": {
    "debug": {
      "keystore": "sign.keystore",  //相对路径：相对于项目根目录
      "alias": "sign",
      "storepass": "123456",
      "keypass": "123456"
    },
    "release": {
      类似
    }
  }
}
```

修改项目 package.json 中的 scripts，添加:

```
{
  "apk:dev": "hb-apk-maker",
  "apk:release": "hb-apk-maker -m release"
}
```

### 指定 buil.json 的位置

`hb-apk-maker -c src/config/build.json`
