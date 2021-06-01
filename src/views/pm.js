const ssbClient = require('ssb-client')

ssbClient((err, sbot) => {
 
  sbot.publish(
    {
      type: 'post',
      text: 'This is a secret message to Shafay',
      
      recps: [
        
        '@H9VgQ8uKgCfbuuU+bjQqIuHFeoWQfPc+TeVo01mF32g=.ed25519',
       
        '@L7pOV7v4AODu1PB95fUywXHP/Bv6OMwPKFBqOhL1Fmk=.ed25519'
      ]
     },
   
    (err, privateMessage) => {
     
      console.log(privateMessage)
      sbot.close()
    })
})