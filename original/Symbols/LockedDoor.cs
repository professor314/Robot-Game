using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CSharpRPG.Symbols
{
    class LockedDoor : Door
    {
        //Set the Key value: note we could also set it in the constructor so we could define a key when we create the door
        private Item _key; 
        
        public LockedDoor(bool orientType, Item key) : base(orientType) 
        {
            _key = key;
        }
      

       public override bool Enter(Character chr)
        {

            //check if the charactor has the appropriate key
            if (chr[_key])
            {
                // we have the key
                // allow the character to proceed
                // as allowed
                return base.Enter(chr);

            }
            else // user does not have key
                return doorFlag; // allow if door open, otherwise no

        }

    }
}