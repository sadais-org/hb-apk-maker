#!/usr/bin/env node
import path from 'path'
import fse from 'fs-extra'
import fs from 'fs'
import Zip from 'adm-zip'
import ora from 'ora'
import { spawn } from 'child_process'
import { Command, Option } from 'commander'
import { exit } from 'process'

const p = new Command()
const modeOpt = new Option('-m, --mode [mode]', '模式选择').choices(['debug', 'release']).default('debug')
const configOpt = new Option('-c, --config <path>', 'build.json path').default('build.json')

p.version('1.0.4')
  .showHelpAfterError(true)
  .addOption(modeOpt)
  .addOption(configOpt)
  .parse()


const ROOT = process.cwd()
const ConfigMap = {
  debug: {
    h5: path.resolve(ROOT, 'dist/dev/app-plus'),
    apk: path.resolve(ROOT, 'dist/debug')
  },
  release: {
    h5: path.resolve(ROOT, 'dist/build/app-plus'),
    apk: path.resolve(ROOT, 'dist/release/apk')
  }
}

function findWWW(root) {
  const results = fs.readdirSync(`${root}/assets/apps`)
  return `${root}/assets/apps/${results[0]}/www`
}

async function main(opts) {
  let spiner = ora({ text: '检测dist目录', color: 'green' })
  spiner.start()
  const distPath = path.resolve(ROOT, 'dist/')
  const isDistExit = fse.pathExistsSync(distPath)
  if (!isDistExit) {
    spiner.fail()
  } else {
    const config = ConfigMap[opts.mode]
    const apkDir = config.apk

    const exitFunc = () => {
      spiner.fail(`apk不存在，请先自定义基座或者正式打包一次`)
      exit(0)
    }

    if (!fse.pathExistsSync(apkDir)) {
      exitFunc()
    }
    const zipPath = `${apkDir}/temp.zip`
    const extractZipPath = `${apkDir}/temp`
    const metaInfPath = `${extractZipPath}/META-INF`
    const targetApkPath = `${apkDir}/target.apk`
    spiner.start('清理临时文件')
    await fse.remove(zipPath)
    await fse.remove(extractZipPath)
    await fse.remove(targetApkPath)
    spiner.succeed()
    const contents = fs.readdirSync(apkDir)
    if (contents.length > 0) {
      const apkName = contents.find((i) => /\.apk/i.test(i))
      const apkPath = `${apkDir}/${apkName}`
      if (!fse.pathExistsSync(apkPath)) {
        exitFunc()
      }
      // 将apk改为zip
      spiner.start('解压apk')
      await fse.copyFile(apkPath, zipPath)
      // 解压到temp目录
      const zip = new Zip(zipPath)
      zip.extractAllTo(extractZipPath, true)
      spiner.succeed()
      // 删除掉temp.zip
      await fse.remove(zipPath)
      // 删除temp/META-INF
      spiner.start('删除META-INF')
      await fse.remove(metaInfPath)
      spiner.succeed()
      // 替换www文件夹内部的内容
      spiner.start('更新www文件夹内容')
      const wwwDir = findWWW(extractZipPath)
      await fse.remove(wwwDir)
      await fse.copy(config.h5, wwwDir)
      spiner.succeed()
      // 重新压缩
      spiner.start('重新打包压缩成zip')
      const newZip = new Zip()
      newZip.addLocalFolder(extractZipPath)
      newZip.writeZip(zipPath)
      await fse.remove(extractZipPath)
      spiner.succeed()
      // 重新签名

      const buildJsonPath = path.resolve(ROOT, opts.config)
      if (fse.pathExistsSync(buildJsonPath)) {
        // 如果存在签名配置文件
        spiner.start('开始签名apk...')
        const buildJson = fse.readJSONSync(buildJsonPath)
        const signInfo = buildJson.android[opts.mode]
        if (!signInfo) {
          spiner.fail(`build.json中没有配置${opts.mode}节点`)
          exit(0)
        }
        const thread = spawn('jarsigner', ['-verbose', '-sigalg', 'MD5withRSA', '-digestalg', 'SHA1', '-keystore', signInfo.keystore, '-storepass', signInfo.storepass, '-keypass', signInfo.keypass, '-signedjar', targetApkPath, zipPath, signInfo.alias])
        thread.stderr.on('data', (data) => {
          spiner.fail(data.toString())
        })
        thread.on('close', async (code) => {
          if (code === 0) {
            spiner.succeed(targetApkPath)
          } else {
            spiner.fail()
          }
          await fse.remove(zipPath)
        })
      } else {
        spiner.fail(`${opts.config}不存在`)
      }
    } else {
      spiner.fail(`apk不存在，请先自定义基座或者正式打包一次`)
    }
  }
}

const opts = p.opts()
const mode = opts.mode
try {
  main(opts)
} catch (e) {

}
