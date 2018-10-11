var authToken = ""
if (authToken.length === 0) {
    var localToken = document.body.appendChild(document.createElement(`iframe`)).contentWindow.localStorage.token
    if (localToken === undefined) {
        console.log(`Getting the auth token from localStorage isn't supported on Chrome or the desktop client. Use Firefox or grab it from a network request's headers.`)
        console.log(`To do that go to the Network tab of your inspector and copy the Authorization header of a request. There are detailed instructions in the tutorial.`)
    } else {
        authToken = JSON.parse(localToken)
    }
}
var username = '???'
var all = true
var beforeId = null

clearMessages = function () {
  const channel = window.location.href.split('/').pop()
  const baseURL = `https://discordapp.com/api/channels/${channel}/messages`
  const headers = {
    Authorization: authToken
  }

  let clock = 0
  let interval = 1000
  let messagesStore = []

  function delay(duration) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, duration)
    })
  }

  function loadMessages() {
    let url = `${baseURL}?limit=100`

    if (beforeId) {
      url += `&before=${beforeId}`
    }
    console.log(`beforeId: ${beforeId}`)
    return fetch(url, {
      headers
    })
  }

  function tryDeleteMessage(message) {
    if (message.author.username === username) {
      console.log(`Deleting message from ${message.author.username} (${message.content.substring(0, 30)}...) at ${message.timestamp}`)

      return fetch(`${baseURL}/${message.id}`, {
        headers,
        method: 'DELETE'
      })
    } else {
      console.log(`Not deleteing message from ${message.author.username} (${message.content.substring(0, 30)}...) at ${message.timestamp}`)
    }
  }

  function filterMessages(message) {
      return (message.author.username === username)
  }

  function onlyNotDeleted(message) {
    return message.deleted === false
  }

  loadMessages()
    .then(resp => resp.json())
    .then(messages => {
      if (messages === null || messages.length === 0) {
        console.log(`We loaded all messages in this chat`)
        return
      }

      beforeId = messages[messages.length - 1].id

      messages.forEach(message => {
        message.deleted = false
      })

      messagesStore = messagesStore.concat(messages.filter(filterMessages))

      console.log(`messagesStore length: ${messagesStore.length}`)

      if (messagesStore.length > 0) {
        return Promise.all(messagesStore.filter(onlyNotDeleted).map(message => {
          return delay(clock += interval)
            .then(() => tryDeleteMessage(message))
            .then(resp => {
              if (resp && resp.status === 204) {
                message.deleted = true
                return resp.text()
              }
            })
            .then(result => {
              if (result)
                result = JSON.parse(result)
            })
        }))
      } else {
        return
      }
    })
    .then(function () {
      clearMessages()
    })
}

clearMessages()
