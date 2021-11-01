const https = require("https")
const fs = require("fs")
const util = require("util")

const get = util.promisify(https.get)

class TestTask {
  static STATUS = {
    LOADING: 0,
    OK: 1,
    FAILED: 2
  }

  constructor(url) {
    this.url = url
    this.task = get(url)
    this.status = TestTask.STATUS.LOADING

    this.task.then(res => {
      if (res.reason.statusCode === 200) {
        this.update(TestTask.STATUS.OK)
      } else {
        this.update(TestTask.STATUS.FAILED)
      }
    }).catch((err) => {
      if (err.statusCode === 200) {
        this.update(TestTask.STATUS.OK)
      } else {
        this.update(TestTask.STATUS.FAILED)
      }
    })
  }

  update(status) {
    this.status = status
  }
}

function renderTask(task) {
  switch (task.status) {
    case TestTask.STATUS.OK:
      return "\r\033[32m[o]\033[39m" + " - \033[42mSuccess\033[0m " + `URL: ${task.url}\n`
    case TestTask.STATUS.FAILED:
      return "\r\033[31m[x]\033[39m" + " - \033[41mFailed \033[0m " + `URL: ${task.url}\n`
    default:
      return "\r\033[33m[ ]\033[39m" + " - \033[43mLoading\033[0m " + `URL: ${task.url}\n`
  }
}

async function main() {
  const { argv } = process
  if (!argv[2]) {
    console.error("引数が与えられていません")
    return
  }

  let file

  try {
    file = fs.readFileSync(argv[2])
  } catch (e) {
    console.error("指定されたファイルが存在しません")
    return
  }

  const urlList = new Set([
    ...file.toString().matchAll(/"https:\/\/teratail\.com\/questions\/\d+\?/g)
  ].map((matched) => matched[0].slice(1, matched[0].length - 1)))

  if (urlList.size == 0) {
    console.error("検査対象のリンクが存在しません")
    return
  }

  const tasks = [...urlList].map(url => new TestTask(url))

  let count = 0;
  const timer = setInterval(() => {
    if (count === 0) {
      console.log(...tasks.map(renderTask))
    } else {
      const dy = -1 * (tasks.length) - 1
      process.stdout.moveCursor(0, dy, () => {
        console.log(...tasks.map(renderTask))
      })
    }

    count++
    if (!tasks.some(task => task.status === TestTask.STATUS.LOADING)) {
      clearInterval(timer)
    }
  }, 200)
}

main()
