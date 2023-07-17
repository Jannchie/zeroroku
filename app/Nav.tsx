'use client'
import { Btn, Flex } from 'roku-ui'
import { TablerBrandBilibili, TablerHome, TablerListNumbers, TablerSettings2, TablerUser } from '@roku-ui/icons-tabler'
import Link from 'next/link'
import { useSelfQuery } from '@/data'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
export function Nav () {
  const { data: self } = useSelfQuery()
  const currentPath = usePathname()
  const buttonsData = [
    { href: '/', iconComponent: <TablerHome />, condition: true },
    { href: '/rank', iconComponent: <TablerListNumbers />, condition: true },
    { href: '/bilibili', iconComponent: <TablerBrandBilibili />, condition: true },
    { href: '/settings', iconComponent: <TablerSettings2 />, condition: true },
    { href: '/me', iconComponent: <TablerUser />, condition: self },
  ]
  return (
    <Flex
      justify="center"
      gap=".25rem"
    >
      {
        buttonsData.map((button) =>
          button.condition !== true
            ? button.condition && (
              <motion.div
                key={button.href}
                layout
              >
                <Btn
                  icon
                  rounded
                  text
                  as={Link}
                  color={button.href === currentPath ? 'primary' : undefined}
                  href={button.href}
                >
                  { button.iconComponent }
                </Btn>
              </motion.div>
            )
            : (
              <motion.div
                key={button.href}
                layout
              >
                <Btn
                  icon
                  rounded
                  text
                  color={button.href === currentPath ? 'primary' : undefined}
                  as={Link}
                  href={button.href}
                >
                  { button.iconComponent }
                </Btn>
              </motion.div>
            ),
        )
      }
    </Flex>
  )
}
