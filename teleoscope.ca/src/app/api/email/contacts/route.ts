// app/api/email/contacts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { LoopsClient } from "loops";

const loops = new LoopsClient(process.env.LOOPS_API_KEY as string);

export async function POST(request: NextRequest) {
  const res = await request.json();

  const email = res["email"];
  const contactProperties = {}

  // Note: updateContact() will create or update a contact

  const resp: {
    success: boolean,
    id?: string,
    message?: string
  } = await loops.updateContact(email, contactProperties);

  if (resp.success) {
    return NextResponse.json({ success: resp.success });
  } else {
    return NextResponse.error();
  }

}
