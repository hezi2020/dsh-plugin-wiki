/**
 * Component smoke: render the section with stubbed shares and assert
 * user-visible copy. Effects (Monaco mounting) do not run under renderToString.
 */
import type { ComponentProps } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CustomToolSection } from '../src/client/section.tsx'
import { zh } from '../src/client/locales.ts'
import type { CustomTool } from '../src/types.ts'

const tool: CustomTool = {
  id: 't1',
  name: 'hello_tool',
  description: 'greets a name',
  parameters: { type: 'object', properties: {} },
  code: 'return 1',
  scope: 'global',
  location: 'global',
  enabled: true,
  source: 'model',
  createdAt: '',
  updatedAt: '',
}

const actions = {
  select: vi.fn(),
  openCreate: vi.fn(),
  openEdit: vi.fn(),
  updateDraft: vi.fn(),
  closeEditor: vi.fn(),
  setSaveStatus: vi.fn(),
}

function renderWith(draft: unknown): string {
  const props = {
    t: (key: string): string => (zh as Record<string, string>)[key] ?? key,
    useScope: (selector: (snapshot: { value: { tools: CustomTool[] } | undefined }) => unknown) => selector({ value: { tools: [tool] } }),
    useTheme: (selector: (value: string) => unknown) => selector('dark'),
    useStore: (selector: (state: unknown) => unknown) => selector(draft === undefined
      ? { selectedId: null, draft: null, saveStatus: 'idle', saveError: null }
      : { selectedId: null, draft, saveStatus: 'idle', saveError: null }),
    actions,
    save: vi.fn(),
    toggleEnabled: vi.fn(),
    remove: vi.fn(),
  } as unknown as ComponentProps<typeof CustomToolSection>
  return renderToString(<CustomToolSection {...props} />)
}

describe('CustomToolSection', () => {
  it('renders the list with the tool row and origin badge', () => {
    const html = renderWith(undefined)
    expect(html).toContain('自定义工具')
    expect(html).toContain('hello_tool')
    expect(html).toContain('模型创建')
    expect(html).toContain('新建工具')
  })

  it('renders the editor when a draft is open', () => {
    const html = renderWith({
      id: null,
      name: 'weather',
      description: 'weather lookup',
      parametersText: '{"type":"object","properties":{"city":{"type":"string"}}}',
      code: 'return 1',
    })
    expect(html).toContain('工具名')
    expect(html).toContain('参数配置')
    expect(html).toContain('添加参数')
    expect(html).toContain('city')
    expect(html).toContain('高级模式：直接编辑 JSON Schema')
    expect(html).toContain('保存')
  })
})
