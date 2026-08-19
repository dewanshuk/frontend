import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import KnowledgeHub from '../knowledgeHub'
import { useNavigate } from 'react-router-dom'
import { getHub } from '@/api/hubApi'

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}))

jest.mock('@/api/hubApi', () => ({
  getHub: jest.fn(),
}))

jest.mock('@/components/landing/LandingSectionPanel', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="landing-section-panel">{children}</div>,
}))

jest.mock('@/components/landing/landingTheme', () => ({
  landingShellInnerClassName: (...classes) => classes.filter(Boolean).join(' '),
  ELECTRIC_BLUE: '#2563eb',
  MARUTI_BLUE: '#171c8f',
}))

jest.mock('@/lib/appNavigation', () => ({
  getKnowledgeHubBasePath: () => '/knowledgeHub',
  isLandingKnowledgeHubPath: () => false,
}))

jest.mock('@/components/knowledgeHub/FilterSection', () => {
  const React = require('react')
  return {
    FilterSection: ({ onApplyFilters, searchPlaceholder }) => {
      const [searchQuery, setSearchQuery] = React.useState('')
      const [selectedApplicability] = React.useState('All MSIL')

      React.useEffect(() => {
        if (onApplyFilters) {
          const timeoutId = setTimeout(() => {
            onApplyFilters({
              search: searchQuery,
              organizations: [],
              types: [],
              applicability: selectedApplicability,
              searchTypesAll: true,
            })
          }, 0)

          return () => clearTimeout(timeoutId)
        }
      }, [searchQuery, selectedApplicability, onApplyFilters])

      return (
        <div data-testid="filter-section">
          <input
            data-testid="search-input"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )
    },
    TYPE_OPTIONS: [
      'Policies',
      'Guidance Notes',
      'Law & Regulation',
      'Training Resources',
      'Flyers',
      'Early Warnings',
    ],
  }
})

jest.mock('@/components/knowledgeHub/KnowledgeCard', () => ({
  KnowledgeCard: ({ heading, onClick, variant }) => (
    <div data-testid={`knowledge-card-${heading}`} onClick={onClick} data-variant={variant}>
      {heading}
    </div>
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('lucide-react', () => ({
  FileText: () => <span data-testid="icon-filetext">FileText</span>,
  FileType: () => <span data-testid="icon-filetype">FileType</span>,
  Scale: () => <span data-testid="icon-scale">Scale</span>,
  Video: () => <span data-testid="icon-video">Video</span>,
  FileImage: () => <span data-testid="icon-fileimage">FileImage</span>,
  BellRing: () => <span data-testid="icon-bellring">BellRing</span>,
}))

const mockHubResponse = {
  message: 'Documents fetched',
  status_code: 200,
  status: 'success',
  data: {
    categories: [
      {
        document_type: 'Policy',
        total: 2,
        new_count: 2,
        items: [
          { id: 1, name: 'Policy Item 1', isNew: true, file_url: null },
          { id: 2, name: 'Policy Item 2', isNew: true, file_url: null },
        ],
      },
      {
        document_type: 'Guidance Notes',
        total: 1,
        new_count: 0,
        items: [
          { id: 3, name: 'Guidance Item 1', isNew: false, file_url: null },
        ],
      },
      {
        document_type: 'Flyers',
        total: 1,
        new_count: 0,
        items: [
          { id: 4, name: 'Flyer Item 1', isNew: false, file_url: 'https://example.com/flyer.png' },
        ],
      },
    ],
  },
}

describe('KnowledgeHub', () => {
  const mockNavigate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    useNavigate.mockReturnValue(mockNavigate)
    getHub.mockResolvedValue(mockHubResponse)
  })

  describe('Rendering', () => {
    it('renders Knowledge Hub title', () => {
      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )
      expect(screen.getByText('Knowledge Hub')).toBeInTheDocument()
    })

    it('renders FilterSection', () => {
      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )
      expect(screen.getByTestId('filter-section')).toBeInTheDocument()
    })

    it('opens detailed view directly with category tabs', async () => {
      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )

      expect(screen.queryByText('Compact View')).not.toBeInTheDocument()
      expect(screen.queryByTestId('view-mode-switch')).not.toBeInTheDocument()

      await waitFor(() => {
        const allButtons = screen.getAllByRole('button')
        expect(allButtons.some((btn) => btn.textContent.includes('Policies'))).toBe(true)
        expect(allButtons.some((btn) => btn.textContent.includes('Guidance Notes'))).toBe(true)
        expect(allButtons.some((btn) => btn.textContent.includes('Flyers'))).toBe(true)
      })
    })
  })

  describe('New count badge', () => {
    it('shows new count badge next to category heading when new_count > 0', async () => {
      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('2 New')).toBeInTheDocument()
      })
    })

    it('does not show badge when new_count is 0', async () => {
      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Guidance Item 1')).toBeInTheDocument()
      })

      expect(screen.queryByText('0 New')).not.toBeInTheDocument()
    })

    it('shows new badge for Early Warnings when API uses is_new / EarlyWarnings', async () => {
      getHub.mockResolvedValue({
        data: {
          categories: [
            {
              document_type: 'EarlyWarnings',
              total: 1,
              new_count: '1',
              items: [
                {
                  id: 91,
                  name: 'EWS Alert Item',
                  is_new: true,
                  file_url: null,
                },
              ],
            },
          ],
        },
      })

      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )

      expect(await screen.findByText('1 New')).toBeInTheDocument()
      expect(screen.getByText('EWS Alert Item')).toBeInTheDocument()
    })
  })

  describe('Type Selection', () => {
    it('clicking type tab toggles that type', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Policy Item 1')).toBeInTheDocument()
      })

      const getPoliciesButton = () =>
        screen.getAllByRole('button').find(
          (btn) => btn.textContent.includes('Policies') && !btn.textContent.includes('Filter')
        )

      const policiesButton = getPoliciesButton()
      expect(policiesButton).toBeDefined()
      expect(policiesButton.className).toContain('bg-[var(--sds-accent-violet)]')

      await act(async () => {
        await user.click(policiesButton)
      })

      await waitFor(() => {
        const next = getPoliciesButton()
        expect(next.className).not.toContain('bg-[var(--sds-accent-violet)]')
      })
    })

    it('shows the empty state when results exist only in an inactive category', async () => {
      const user = userEvent.setup()
      getHub.mockResolvedValue({
        data: {
          categories: [mockHubResponse.data.categories[0]],
        },
      })

      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )

      await screen.findByText('Policy Item 1')

      const policiesButton = screen.getAllByRole('button').find(
        (button) =>
          button.textContent.includes('Policies') &&
          !button.textContent.includes('Filter')
      )

      await act(async () => {
        await user.click(policiesButton)
      })

      expect(
        await screen.findByText('No item match your filter')
      ).toBeInTheDocument()
    })
  })

  describe('Card Interactions', () => {
    it('clicking card navigates to detail page', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <KnowledgeHub />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('knowledge-card-Policy Item 1')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('knowledge-card-Policy Item 1'))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
        const navigateArg = mockNavigate.mock.calls.at(-1)?.[0]
        expect(String(navigateArg)).toMatch(/knowledgeHub/i)
      })
    })
  })
})
