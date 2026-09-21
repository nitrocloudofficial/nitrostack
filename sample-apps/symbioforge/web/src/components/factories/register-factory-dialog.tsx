"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FactoryRegistrationInput, factoryRegistrationSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Plus, Loader2 } from "lucide-react"

export function RegisterFactoryDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<FactoryRegistrationInput>({
    resolver: zodResolver(factoryRegistrationSchema),
    defaultValues: {
      name: "",
      industryType: "",
      location: { lat: 0, lng: 0, address: "" },
      productionCapacity: "",
      rawMaterials: [],
      declaredWastes: [],
    },
  })

  async function onSubmit(data: FactoryRegistrationInput) {
    try {
      const res = await fetch("/api/factories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      toast({
        title: "Factory Registered",
        description: `${data.name} has been successfully added to the cluster.`,
      })
      
      setOpen(false)
      form.reset()
      onSuccess()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred."
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: message,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
          <Plus className="mr-2 h-4 w-4" /> Register Factory
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Register Factory</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add a new industrial node to the symbiosis network. Click save when you are done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Factory Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Textiles" className="bg-zinc-900 border-zinc-800" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Industry Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Textiles, Manufacturing" className="bg-zinc-900 border-zinc-800" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="location.address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Industrial Way" className="bg-zinc-900 border-zinc-800" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location.lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Latitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" className="bg-zinc-900 border-zinc-800" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location.lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Longitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" className="bg-zinc-900 border-zinc-800" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="productionCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Production Capacity</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 1000 tons/month" className="bg-zinc-900 border-zinc-800" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rawMaterials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Raw Materials (comma separated)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Cotton, Dye" 
                      className="bg-zinc-900 border-zinc-800" 
                      onChange={e => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
                      defaultValue={field.value?.join(", ")}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="declaredWastes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Declared Wastes (comma separated)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Cotton scraps, Sludge" 
                      className="bg-zinc-900 border-zinc-800" 
                      onChange={e => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
                      defaultValue={field.value?.join(", ")}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Factory
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
