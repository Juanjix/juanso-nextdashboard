'use server'

// NEXT
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// SQL
import { sql } from "@vercel/postgres";

// VALIDATE DATA
import { z } from "zod";


// Este es el Schema que tiene el formulario
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.'
  }),
  amount: z.coerce
    .number()
    .gt(0, {message: 'Please enter an amount greater tan $0'}),
  status: z.enum(['pending','paid'],{
    invalid_type_error: 'Please select an invoice status',
  }),
  date: z.string(),
})

// Con esto estoy omitiendo los valores id y date
const CreaterInvoice = FormSchema.omit({id: true, date: true});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
}

// Function para crear un INVOICE
export async function createInvoice(prevState: State, formData: FormData){
  // Validate form using Zod
  const validatedFields = CreaterInvoice.safeParse ({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  })

  // if validation fails, return error early. Otherwise, continue.
  if(!validatedFields.success){
    return{
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields, Failed to Create Invoice.',
    }
  }


  // Prepare data for insertion into the database
  const {customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

 try{
   await sql`
    INSERT INTO invoices (customer_id, amount, status ,date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;
  } catch (error){
    return{messege: 'Database Error: Failed to Create Invoice'}
  }
  // actualiza el path
  revalidatePath('/dashboard/invoices');

  // redirige al path
  redirect('/dashboard/invoices');

}

// Con esto estoy omitiendo los valores id y date
const UpdateInvoice = FormSchema.omit({id: true, date: true});

// Function para ACTUALIZAR un INVOICE
export async function updateInvoice(id: string, formData: FormData){

  const {customerId, amount, status} = UpdateInvoice.parse({
    costumberId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  const amountInCents = amount * 100;

  try{
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `
  } catch(error){
    return{message: 'Database Erro: Failed to UpdateInvoice'}
  }

  // actualiza el path
  revalidatePath('/dashboard/invoices');

  // redirige al path
  redirect('/dashboard/invoices')
}

//Function para eliminar un invoice
export async function deleteInvoice(id: string){
  throw new Error('Failed to Delete Invoice');
  
  try{
    await sql`DELETE FROM invoices WHERE id = ${id};`
    revalidatePath('dashboard/invoices');
    return{message: 'Delete Invoice'}
  }catch(error){
    return{
      message: "Database Error: Failed to Delete Invoice"
    }
  }

}