var regex = /^:::[\t\f ]*(\S+)[\t\f ]*(.*?)$/m;

function plugin(options) {
   options = options || {
      default: true
   }
   options.custom = options.custom || []

   function defaultTokenizer(eat, value, silent) {
      // might be a match
      if (value.startsWith(":::")) {

         var m = regex.exec(value)
         if (m) {
            if (silent) return true

            var [type, config] = [m[1], m[2]]

            var container = []
            var depth = 0
            var i = 0
            var lines = value.split('\n')

            do {
               let line = lines[i++]
               if (/^:::[\t\f ]*\S+.*$/.exec(line)) {
                  // found nested container
                  ++depth
               } else if (line === ':::') {
                  // found end of nested container
                  --depth
               }
               container.push(line)
            } while (depth > 0 && i <= lines.length)

            if (depth == 0) {
               var exit = this.enterBlock()
               // if we reach the end of the lines and the depth is not 0, there is a mismatch of start and closing containers and we should not process the container
               // form the body from the container lines except the first and last lines
               var body = container.slice(1, container.length - 1).join('\n')

               // Eat the container
               var add = eat(container.join('\n'))

               var node = {
                  type: type,
                  data: {
                     hName: type
                  }
               }

               // if there is a config string, use that as the element class
               if (config.trim() !== '') {
                  node.data.hProperties = {
                     className: config.trim()
                  }
               }

               node.children = this.tokenizeBlock(body, eat.now())
               add(node)
               exit()
            }
         }
      }
   }

   const Parser = this.Parser
   const blockTokenizers = Parser.prototype.blockTokenizers
   const blockMethods = Parser.prototype.blockMethods

   var insertPoint = blockMethods.indexOf('fencedCode') + 1

   options.custom.forEach(el => {
      if (el.type !== undefined && el.type !== '' && el.transform !== undefined) {
         let name = `${el.type}_container`

         blockTokenizers[name] = function(eat, value, silent) {
            if (value.startsWith(":::")) {
               // might be a match
               var m = regex.exec(value)
               // only match containers of the specified type
               if (m && m[1] === el.type) {
                  if (silent) return true

                  var [type, config] = [m[1], m[2]]

                  var container = []
                  var depth = 0
                  var i = 0
                  var lines = value.split('\n')

                  do {
                     let line = lines[i++]
                     if (/^:::[\t\f ]*\S+.*$/.exec(line)) {
                        // found nested container
                        ++depth
                     } else if (line === ':::') {
                        // found end of nested container
                        --depth
                     }
                     container.push(line)
                  } while (depth > 0 && i <= lines.length)

                  if (depth == 0) {
                     var exit = this.enterBlock()
                     var now = eat.now()

                     var body = container.slice(1, container.length - 1).join('\n')

                     // Eat the container
                     var add = eat(container.join('\n'))

                     var node = {
                        type: type,
                        data: {
                           hName: el.element || 'div'
                        }
                     }

                     node.children = this.tokenizeBlock(body, now)
                     // pass the transform a tokenize function with the current location in case they want to parse the config 
                     el.transform(node, config, (value) => this.tokenizeInline(value, now))

                     add(node)
                     exit()
                  }
               }
            }
         }

         blockMethods.splice(insertPoint++, 0, name)
      }
   })

   if (options.default) {
      blockTokenizers.container = defaultTokenizer
      blockMethods.splice(insertPoint, 0, 'container')
   }
}

module.exports = plugin