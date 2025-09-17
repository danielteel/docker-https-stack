import { useState } from 'react'
import { Button, HStack } from "@chakra-ui/react"

const Demo = () => {
  return (
    <HStack>
      <Button>Click me</Button>
      <Button>Click me</Button>
    </HStack>
  )
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Demo/>
    </>
  )
}

export default App
