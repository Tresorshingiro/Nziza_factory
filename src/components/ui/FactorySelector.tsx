import { useState, useEffect } from 'react'
import { Factory, ChevronDown, MapPin, Users, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface FactoryOption {
  id: string
  name: string
  location: string
  status: string
  manager_count?: number
}

interface FactorySelectorProps {
  selectedFactoryId?: string | null
  onFactoryChange: (factoryId: string | null) => void
  placeholder?: string
  showAllOption?: boolean
  className?: string
}

export default function FactorySelector({ 
  selectedFactoryId, 
  onFactoryChange, 
  placeholder = "Select Factory",
  showAllOption = true,
  className = ""
}: FactorySelectorProps) {
  const [factories, setFactories] = useState<FactoryOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFactories()
  }, [])

  const fetchFactories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('factories')
        .select('id, name, location, status')
        .order('name')

      if (error) throw error

      const factoriesWithCounts: FactoryOption[] = (data || []).map((factory: any) => ({
        id: factory.id,
        name: factory.name,
        location: factory.location,
        status: factory.status,
        manager_count: 0 // We'll fetch this later if needed
      }))

      setFactories(factoriesWithCounts)
    } catch (error) {
      console.error('Error fetching factories:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedFactory = factories.find(f => f.id === selectedFactoryId)

  const handleFactorySelect = (factoryId: string | null) => {
    onFactoryChange(factoryId)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Factory className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-left">
            {loading ? (
              <span className="text-gray-500">Loading factories...</span>
            ) : selectedFactory ? (
              <div>
                <p className="font-medium text-gray-900">{selectedFactory.name}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {selectedFactory.location}
                </p>
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* All Factories Option */}
          {showAllOption && (
            <button
              onClick={() => handleFactorySelect(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                !selectedFactoryId ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
              }`}
            >
              <div className="p-2 bg-gray-100 rounded-lg">
                <Factory className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">All Factories</p>
                <p className="text-sm text-gray-500">View data from all factories</p>
              </div>
              {!selectedFactoryId && (
                <Check className="w-5 h-5 text-purple-600" />
              )}
            </button>
          )}

          {/* Divider */}
          {showAllOption && factories.length > 0 && (
            <div className="border-t border-gray-100" />
          )}

          {/* Factory Options */}
          {factories.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Factory className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No factories found</p>
              <p className="text-sm">Create a factory to get started</p>
            </div>
          ) : (
            factories.map((factory) => (
              <button
                key={factory.id}
                onClick={() => handleFactorySelect(factory.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selectedFactoryId === factory.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  factory.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Factory className={`w-4 h-4 ${
                    factory.status === 'active' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{factory.name}</p>
                    {factory.status !== 'active' && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {factory.status === 'frozen' ? 'Frozen' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {factory.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {factory.manager_count} manager{factory.manager_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {selectedFactoryId === factory.id && (
                  <Check className="w-5 h-5 text-purple-600" />
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Click Outside Handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}