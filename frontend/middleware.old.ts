import { proxy, config } from './proxy'
import type { NextRequest } from 'next/server'

export default function middleware(request: NextRequest) {
    return proxy(request)
}

export { config }
