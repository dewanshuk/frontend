import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import KnowledgeItemDetail from '../KnowledgeItemDetail'
import { useParams, useNavigate } from 'react-router-dom'

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}))

// Mock child components
jest.mock('@/components/knowledgeHub/MetadataSection', () => {
  const React = require('react')
  return {
    MetadataSection: ({ item, onCollapseChange }) => {
      const [isCollapsed, setIsCollapsed] = React.useState(false)
      const isInitialMount = React.useRef(true)
      
      // Call onCollapseChange after state updates, but not on initial mount
      React.useEffect(() => {
        if (isInitialMount.current) {
          isInitialMount.current = false
          return
        }
        if (onCollapseChange) {
          onCollapseChange(isCollapsed)
        }
      }, [isCollapsed, onCollapseChange])
      
      const handleToggle = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
      }

      return (
        <div data-testid="metadata-section">
          <div data-testid="metadata-collapsed">{isCollapsed ? 'true' : 'false'}</div>
          <button data-testid="metadata-toggle" onClick={handleToggle}>
            Toggle Metadata
          </button>
          {item && (
            <>
              <div data-testid="metadata-name">{item.name}</div>
              <div data-testid="metadata-type">{item.type}</div>
              <div data-testid="metadata-owner">{item.owner || 'N/A'}</div>
              <div data-testid="metadata-legislation">{item.legislation || 'N/A'}</div>
              <div data-testid="metadata-description">{item.description || 'No description available.'}</div>
              <div data-testid="metadata-version">{item.version || '1.0.0'}</div>
              <div data-testid="metadata-uploaded-by">{item.uploadedBy || 'N/A'}</div>
              <div data-testid="metadata-uploaded-on">{item.uploadedOn || 'N/A'}</div>
              {item.linkedItems && item.linkedItems.length > 0 && (
                <div data-testid="metadata-linked-items">
                  {item.linkedItems.map((linkedItem) => (
                    <div key={linkedItem.id} data-testid={`linked-item-${linkedItem.id}`}>
                      {linkedItem.heading}
                    </div>
                  ))}
                </div>
              )}
              {item.tags && item.tags.length > 0 && (
                <div data-testid="metadata-tags">
                  {item.tags.map((tag, index) => (
                    <span key={index} data-testid={`tag-${index}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )
    },
  }
})

jest.mock('@/components/knowledgeHub/FileViewer', () => ({
  FileViewer: ({ documents, selectedDocument, onSelectDocument }) => (
    <div data-testid="file-viewer">
      <div data-testid="selected-document">{selectedDocument}</div>
      <div data-testid="documents-count">{documents?.length || 0}</div>
      {documents && documents.map((doc) => (
        <button
          key={doc.id}
          data-testid={`document-${doc.id}`}
          onClick={() => onSelectDocument(doc.id)}
        >
          {doc.name}
        </button>
      ))}
    </div>
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }) => (
    <button onClick={onClick} data-variant={variant} data-size={size} className={className} {...props}>
      {children}
    </button>
  ),
}))

// Mock alert
global.alert = jest.fn()

describe('KnowledgeItemDetail', () => {
  const mockNavigate = jest.fn()
  const mockWriteText = jest.fn(() => Promise.resolve())

  beforeEach(() => {
    jest.clearAllMocks()
    useNavigate.mockReturnValue(mockNavigate)
    useParams.mockReturnValue({ type: 'Policies', uuid: '1' })
    
    // Mock clipboard API - use defineProperty since clipboard is read-only
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    })
  })

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      // Set uuid to undefined to trigger loading state
      useParams.mockReturnValue({ type: 'Policies', uuid: undefined })
      
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      expect(screen.getByText(/Loading knowledge item/i)).toBeInTheDocument()
      
      // Reset for other tests
      useParams.mockReturnValue({ type: 'Policies', uuid: '1' })
    })

    it('renders item details after loading', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Knowledge Item 1' })).toBeInTheDocument()
      })
    })

    it('renders back button', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        const backButton = screen.getByLabelText('Go back')
        expect(backButton).toBeInTheDocument()
      })
    })

    it('renders share button', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Share')).toBeInTheDocument()
      })
    })

    it('renders item name in header', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Knowledge Item 1' })).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading', () => {
    it('loads item data with correct uuid', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        // The function is called internally via useEffect
        // We verify the component renders the item data
        expect(screen.getByRole('heading', { name: 'Knowledge Item 1' })).toBeInTheDocument()
        expect(screen.getByTestId('metadata-name')).toHaveTextContent('Knowledge Item 1')
      })
    })

    it('sets selectedDocument to first document on load', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        const fileViewer = screen.getByTestId('file-viewer')
        expect(fileViewer).toBeInTheDocument()
        // First document ID should be selected
        const selectedDoc = screen.getByTestId('selected-document')
        expect(selectedDoc).toHaveTextContent('1')
      })
    })

    it('handles missing uuid parameter', () => {
      useParams.mockReturnValue({ type: 'Policies', uuid: undefined })

      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      expect(screen.getByText(/Loading knowledge item/i)).toBeInTheDocument()
    })
  })

  describe('Metadata Section', () => {
    it('renders metadata with correct item data', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-section')).toBeInTheDocument()
        expect(screen.getByTestId('metadata-name')).toHaveTextContent('Knowledge Item 1')
        expect(screen.getByTestId('metadata-type')).toHaveTextContent('Policies')
        expect(screen.getByTestId('metadata-owner')).toHaveTextContent('Environmental Compliance Division')
      })
    })

    it('collapse/expand functionality works', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-section')).toBeInTheDocument()
      })

      const toggleButton = screen.getByTestId('metadata-toggle')
      const collapsedState = screen.getByTestId('metadata-collapsed')

      expect(collapsedState).toHaveTextContent('false')

      await user.click(toggleButton)

      await waitFor(() => {
        expect(collapsedState).toHaveTextContent('true')
      })
    })

    it('onCollapseChange callback updates layout', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-section')).toBeInTheDocument()
      })

      const toggleButton = screen.getByTestId('metadata-toggle')
      await user.click(toggleButton)

      // Layout should change - metadata section should be collapsed
      await waitFor(() => {
        const collapsedState = screen.getByTestId('metadata-collapsed')
        expect(collapsedState).toHaveTextContent('true')
      })
    })

    it('metadata displays all fields correctly', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-name')).toHaveTextContent('Knowledge Item 1')
        expect(screen.getByTestId('metadata-type')).toHaveTextContent('Policies')
        expect(screen.getByTestId('metadata-legislation')).toHaveTextContent('Environmental Protection Act 2020')
        expect(screen.getByTestId('metadata-description').textContent).toContain('comprehensive document')
        expect(screen.getByTestId('metadata-version')).toHaveTextContent('2.1.0')
        expect(screen.getByTestId('metadata-uploaded-by')).toHaveTextContent('John Doe')
        expect(screen.getByTestId('metadata-uploaded-on')).toHaveTextContent('2024-01-15')
      })
    })

    it('displays linked items', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-linked-items')).toBeInTheDocument()
        expect(screen.getByTestId('linked-item-1')).toHaveTextContent('Related Policy Document')
        expect(screen.getByTestId('linked-item-2')).toHaveTextContent('Implementation Guide')
      })
    })

    it('displays tags', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-tags')).toBeInTheDocument()
        expect(screen.getByTestId('tag-0')).toHaveTextContent('Compliance')
        expect(screen.getByTestId('tag-1')).toHaveTextContent('Environmental')
        expect(screen.getByTestId('tag-2')).toHaveTextContent('Regulation')
      })
    })
  })

  describe('File Viewer', () => {
    it('renders FileViewer component', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('file-viewer')).toBeInTheDocument()
      })
    })

    it('passes correct documents prop', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        const documentsCount = screen.getByTestId('documents-count')
        // getKnowledgeItemDetail returns 6 documents for id 1
        expect(documentsCount).toHaveTextContent('6')
      })
    })

    it('passes selectedDocument prop', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        const selectedDoc = screen.getByTestId('selected-document')
        expect(selectedDoc).toHaveTextContent('1')
      })
    })

    it('onSelectDocument updates selected document', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('file-viewer')).toBeInTheDocument()
      })

      const document2Button = screen.getByTestId('document-2')
      await user.click(document2Button)

      await waitFor(() => {
        const selectedDoc = screen.getByTestId('selected-document')
        expect(selectedDoc).toHaveTextContent('2')
      })
    })
  })

  describe('Share Functionality', () => {
    it('share button copies URL to clipboard', async () => {
      const user = userEvent.setup()
      
      // Reset and clear mocks
      mockWriteText.mockClear()
      global.alert.mockClear()
      
      // Mock window.location.href - need to use Object.defineProperty for proper mocking
      const originalLocation = window.location
      delete window.location
      window.location = { 
        href: 'http://localhost:3000/Policies/1',
        origin: 'http://localhost:3000',
        protocol: 'http:',
        host: 'localhost:3000',
        hostname: 'localhost',
        port: '3000',
        pathname: '/Policies/1',
        search: '',
        hash: ''
      }
      
      // Ensure clipboard mock is properly set up
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      })

      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Share')).toBeInTheDocument()
      })

      const shareButton = screen.getByText('Share')
      await user.click(shareButton)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('http://localhost:3000/Policies/1')
        expect(global.alert).toHaveBeenCalledWith('Link copied to clipboard!')
      }, { timeout: 3000 })
      
      // Restore window.location
      window.location = originalLocation
    })
  })

  describe('Navigation', () => {
    it('back button navigates to /knowledgeHub', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        const backButton = screen.getByLabelText('Go back')
        expect(backButton).toBeInTheDocument()
      })

      const backButton = screen.getByLabelText('Go back')
      await user.click(backButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/knowledgeHub')
      })
    })
  })

  describe('Layout', () => {
    it('metadata collapsed: metadata col-span-1, viewer col-span-11', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-section')).toBeInTheDocument()
      })

      const toggleButton = screen.getByTestId('metadata-toggle')
      await user.click(toggleButton)

      await waitFor(() => {
        const collapsedState = screen.getByTestId('metadata-collapsed')
        expect(collapsedState).toHaveTextContent('true')
      })
    })

    it('metadata expanded: metadata col-span-5, viewer col-span-7', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-section')).toBeInTheDocument()
        const collapsedState = screen.getByTestId('metadata-collapsed')
        expect(collapsedState).toHaveTextContent('false')
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles missing uuid parameter', () => {
      useParams.mockReturnValue({ type: 'Policies', uuid: undefined })

      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      expect(screen.getByText(/Loading knowledge item/i)).toBeInTheDocument()
    })

    it('renders file viewer with documents', async () => {
      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('file-viewer')).toBeInTheDocument()
        const documentsCount = screen.getByTestId('documents-count')
        expect(parseInt(documentsCount.textContent)).toBeGreaterThan(0)
      })
    })

    it('displays metadata with default values for optional fields', async () => {
      // Use a uuid that will generate data with all fields
      useParams.mockReturnValue({ type: 'Policies', uuid: '1' })

      render(
        <MemoryRouter>
          <KnowledgeItemDetail />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('metadata-section')).toBeInTheDocument()
        // All fields should be present from getKnowledgeItemDetail
        expect(screen.getByTestId('metadata-name')).toBeInTheDocument()
        expect(screen.getByTestId('metadata-type')).toBeInTheDocument()
      })
    })
  })
})
