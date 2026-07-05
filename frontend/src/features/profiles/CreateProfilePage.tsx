import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModelSelector } from '@/components/common/ModelSelector'
import { useToast } from '@/components/common/Toaster'
import { useCreateProfile } from '@/features/profiles/hooks/useProfiles'
import { createProfileSchema, type CreateProfileFormValues } from '@/features/profiles/schemas/createProfileSchema'
import { ApiError } from '@/services/api'
import type { AIModel } from '@/types'

export function CreateProfilePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createProfile = useCreateProfile()
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateProfileFormValues>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      name: '',
      domain: '',
      industry: '',
      description: '',
      competitors: [],
    },
  })

  const [competitors, setCompetitors] = useState<string[]>([''])

  const updateCompetitors = (next: string[]) => {
    setCompetitors(next)
    setValue('competitors', next.filter((c) => c.trim()), { shouldValidate: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const competitors = values.competitors.filter((c) => c.trim())
      const profile = await createProfile.mutateAsync({
        ...values,
        competitors,
        preferred_model: selectedModel,
      } as CreateProfileFormValues & { preferred_model: string })
      toast({ title: 'Profile created', description: `${profile.name} is ready for analysis.` })
      navigate(`/profiles/${profile.id}`)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create profile'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Profile</h1>
        <p className="text-muted-foreground">Add a new brand profile for AI visibility analysis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Acme Corp" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" placeholder="acme.com" {...register('domain')} />
              {errors.domain && <p className="text-sm text-destructive">{errors.domain.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" placeholder="B2B Software" {...register('industry')} />
              {errors.industry && <p className="text-sm text-destructive">{errors.industry.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Brief description (optional)" {...register('description')} />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <ModelSelector
              value={selectedModel}
              onChange={(model: AIModel) => setSelectedModel(model.id)}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Competitors</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateCompetitors([...competitors, ''])}
                  disabled={competitors.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {competitors.map((_, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Competitor ${index + 1}`}
                    value={competitors[index]}
                    onChange={(e) => {
                      const next = [...competitors]
                      next[index] = e.target.value
                      updateCompetitors(next)
                    }}
                  />
                  {competitors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => updateCompetitors(competitors.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {errors.competitors && (
                <p className="text-sm text-destructive">
                  {typeof errors.competitors.message === 'string'
                    ? errors.competitors.message
                    : 'Invalid competitors'}
                </p>
              )}
            </div>

            <Button type="submit" disabled={createProfile.isPending} className="w-full sm:w-auto">
              {createProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
